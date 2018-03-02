import chalk from 'chalk';
import fp from 'lodash/fp';

import { UrlUtils, Project } from 'xdl';

import log from '../log';
import urlOpts from '../urlOpts';

const logArtifactUrl = (platform) => async (projectDir, options) => {
  const res = await Project.buildAsync(projectDir, { current: false, mode: 'status' });
  const url = fp.compose(
    fp.get(['artifacts', 'url']),
    fp.head,
    fp.filter(job => platform && job.platform === platform),
    fp.getOr([], 'jobs')
  )(res);
  if (url) {
    console.log(url);
  } else {
    throw new Error(`No ${platform} binary file found.`);
  }
}

async function action(projectDir, options) {
  await urlOpts.optsAsync(projectDir, options);

  let url = await UrlUtils.constructManifestUrlAsync(projectDir);

  log('You can scan this QR code:\n');
  urlOpts.printQRCode(url);

  log('Your URL is\n\n' + chalk.underline(url) + '\n');
  log.raw(url);

  await urlOpts.handleMobileOptsAsync(projectDir, options);
  // this is necessary because we have undiagnosed event loop gunk that prevents exit
  process.exit();
}

export default program => {
  program
    .command('url [project-dir]')
    .alias('u')
    .description('Displays the URL you can use to view your project in Expo')
    .urlOpts()
    .allowOffline()
    .allowNonInteractive()
    .asyncActionProjectDir(action);

  program
    .command('url:ipa [project-dir]')
    .alias('ui')
    .description('Displays the standalone iOS binary URL you can use to download your app binary')
    .allowOffline()
    .allowNonInteractive()
    .asyncActionProjectDir(logArtifactUrl('ios'), true);

  program
    .command('url:apk [project-dir]')
    .alias('ua')
    .description('Displays the standalone Android binary URL you can use to download your app binary')
    .allowOffline()
    .allowNonInteractive()
    .asyncActionProjectDir(logArtifactUrl('android'), true);

};
