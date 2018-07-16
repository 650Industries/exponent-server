// @flow

import tc from 'turbocolor';
import { Project } from 'xdl';

export function installExitHooks(projectDir: string) {
  // install ctrl+c handler that writes non-running state to directory
  if (process.platform === 'win32') {
    require('readline')
      .createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      .on('SIGINT', () => {
        process.emit('SIGINT');
      });
  }

  process.on('SIGINT', () => {
    console.log(tc.blue('\nStopping packager...'));
    Project.stopAsync(projectDir).then(() => {
      console.log(tc.green('Packager stopped.'));
      process.exit();
    });
  });
}
