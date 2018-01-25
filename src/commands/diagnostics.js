import { Diagnostics } from 'xdl';
import { print as envinfoPrint } from 'envinfo';

import simpleSpinner from '@expo/simple-spinner';

import log from '../log';

async function action(options) {
  log('Generating diagnostics report...');
  log('You can join our slack here: https://slack.expo.io/.');

  envinfoPrint();

  console.log(`\x1b[4mDiagnostics report:\x1b[0m`);
  simpleSpinner.start();
  const { url } = await Diagnostics.getDeviceInfoAsync({
    uploadLogs: true,
  });
  simpleSpinner.stop();
  console.log(`  ${url}\n`);
  log.raw(url);
}

export default program => {
  program
    .command('diagnostics [project-dir]')
    .description('Uploads diagnostics information and returns a url to share with the Expo team.')
    .asyncAction(action);
};
