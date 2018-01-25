// Getting an undefined anywhere here probably means a ruby script is throwing an exception
import child_process from 'child_process';
import slash from 'slash';
import spawnAsync from '@expo/spawn-async';
import { basename } from 'path';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import { release, userInfo } from 'os';

import log from '../../log';

const FASTLANE =
  process.platform === 'darwin'
    ? require('@expo/traveling-fastlane-darwin')()
    : require('@expo/traveling-fastlane-linux')();

const WSL_BASH = 'C:\\Windows\\system32\\bash.exe';

const WSL_ONLY_PATH = 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';

export const NO_BUNDLE_ID = 'App could not be found for bundle id';

export const MULTIPLE_PROFILES = 'Multiple profiles found with the name';

export const DEBUG = process.env.EXPO_DEBUG && process.env.EXPO_DEBUG === 'true';

const ENABLE_WSL = `
Does not seem like WSL enabled on this machine. Download from the Windows app
store a distribution of Linux, then in an admin powershell, please run:

Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
`;

export const doesFileProvidedExist = async (printOut, p12Path) => {
  try {
    const stats = await fs.stat(p12Path);
    return stats.isFile();
  } catch (e) {
    if (printOut) {
      console.log('\nFile does not exist.');
    }
    return false;
  }
};

export const doFastlaneActionsExist = async () => {
  return Promise.all(
    Object.keys(FASTLANE)
      .filter(k => k !== FASTLANE.ruby_dir)
      .map(async action => {
        let path = FASTLANE[action];
        return { action, path, doesExist: await doesFileProvidedExist(false, path) };
      })
  );
};

function appStoreAction(creds, metadata, teamId, action) {
  const args = [
    action,
    creds.appleId,
    creds.password,
    teamId,
    metadata.bundleIdentifier,
    metadata.experienceName,
  ];
  return spawnAndCollectJSONOutputAsync(FASTLANE.app_management, args);
}

export function createAppOnPortal(creds, metadata, teamId) {
  return appStoreAction(creds, metadata, teamId, 'create');
}

export function ensureAppIdLocally(creds, metadata, teamId) {
  return appStoreAction(creds, metadata, teamId, 'verify');
}

export function produceProvisionProfile(credentials, { bundleIdentifier }, teamId) {
  return spawnAndCollectJSONOutputAsync(FASTLANE.fetch_new_provisioning_profile, [
    credentials.appleId,
    credentials.password,
    bundleIdentifier,
    teamId,
  ]);
}

export function producePushCerts(credentials, { bundleIdentifier }, teamId) {
  return spawnAndCollectJSONOutputAsync(FASTLANE.fetch_push_cert, [
    credentials.appleId,
    credentials.password,
    bundleIdentifier,
    teamId,
  ]);
}

export function produceCerts(credentials, teamId) {
  return spawnAndCollectJSONOutputAsync(FASTLANE.fetch_cert, [
    credentials.appleId,
    credentials.password,
    teamId,
  ]);
}

const NO_TEAM_ID = `You have no team ID associated with your apple account, cannot proceed.
(Do you have a paid Apple developer Account?)`;

export async function validateCredentialsProduceTeamId(creds) {
  const getTeamsAttempt = await spawnAndCollectJSONOutputAsync(
    FASTLANE.validate_apple_credentials,
    [creds.appleId, creds.password]
  );
  if (DEBUG) {
    console.log({ action: 'teams attempt retrieval', dump: getTeamsAttempt });
  }
  if (getTeamsAttempt.result === 'failure') {
    const { reason, rawDump } = getTeamsAttempt;
    throw new Error(`Reason:${reason}, raw:${JSON.stringify(rawDump)}`);
  }
  const { teams } = getTeamsAttempt;
  if (teams.length === 0) {
    throw new Error(NO_TEAM_ID);
  }
  log(`You have ${teams.length} teams`);
  if (teams.length === 1) {
    console.log(`Only 1 team associated with your account, using Team ID: ${teams[0].teamId}`);
    return { teamId: teams[0].teamId };
  } else {
    const teamChoices = teams.map(
      (team, i) => `${i + 1}) ${team['teamId']} "${team['name']}" (${team['type']})`
    );
    teamChoices.forEach(choice => console.log(choice));
    const answers = await inquirer.prompt({
      type: 'list',
      name: 'choice',
      message: `Which Team ID to use?`,
      choices: teamChoices,
    });
    return { teamId: teams[teamChoices.indexOf(answers.choice)].teamId };
  }
}

const windowsToWSLPath = p => {
  const noSlashes = slash(p);
  return noSlashes.slice(2, noSlashes.length);
};
const MINUTES = 10;
const TIMEOUT = 60 * 1000 * MINUTES;

const timeout_msg = (prgm, args) =>
  process.platform === 'win32'
    ? `Took too long (limit is ${MINUTES} minutes) to execute ${prgm} ${args}.
Is your WSL working? in Powershell try: bash.exe -c 'uname'`
    : `Took too long (limit is ${MINUTES} minutes) to execute ${prgm} ${args}`;

const opts = { stdio: ['inherit', 'pipe', 'pipe'] };

export async function prepareLocalAuth() {
  if (process.platform === 'win32') {
    const [version] = release().match(/\d./);
    if (version !== '10') {
      throw new Error('Must be on at least Windows version 10 for WSL support to work');
    }
    const { username } = userInfo();
    if (username && username.split(' ').length !== 1) {
      log.warn('Your username should not have empty space in it, exp might fail');
    }
    // Does bash.exe exist?
    try {
      await fs.access(WSL_BASH, fs.constants.F_OK);
    } catch (e) {
      log.warn(ENABLE_WSL);
      throw e;
    }
  }
}

const USER_PERMISSIONS_ERROR =
  'You probably do not have user permissions for where exp is installed, consider changing permissions there';

async function spawnAndCollectJSONOutputAsync(program, args) {
  let prgm = program;
  let cmd = args;
  return Promise.race([
    new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error(timeout_msg(prgm, cmd))), TIMEOUT);
    }),
    new Promise((resolve, reject) => {
      const jsonContent = [];
      try {
        if (process.platform === 'win32') {
          prgm = WSL_BASH;
          cmd = ['-c', `${WSL_ONLY_PATH} /mnt/c${windowsToWSLPath(program)} ${args.join(' ')}`];
          var child = child_process.spawn(prgm, cmd, opts);
        } else {
          var child = child_process.spawn(prgm, cmd, opts);
        }
      } catch (e) {
        return reject(e);
      }
      child.stdout.on('data', d => console.log(d.toString()));
      // This is where we get our replies back from the ruby code
      child.stderr.on('data', d => jsonContent.push(d));
      child.stdout.on('end', () => {
        const reply = Buffer.concat(jsonContent).toString();
        try {
          resolve(JSON.parse(reply));
        } catch (e) {
          reject({
            result: 'failure',
            reason:
              reply.match(/Bundler::InstallError/) === null
                ? 'Could not understand JSON reply from Ruby based local auth scripts'
                : USER_PERMISSIONS_ERROR,
            rawDump: reply,
          });
        }
      });
    }),
  ]);
}
