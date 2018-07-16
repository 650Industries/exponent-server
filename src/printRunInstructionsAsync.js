import { User as UserManager } from 'xdl';
import tc from 'turbocolor';
import log from './log';

export default async function printRunInstructionsAsync() {
  let user = await UserManager.getCurrentUserAsync();

  // If no user, we are offline and can't connect
  if (user) {
    log.newLine();
    log(tc.bold('Instructions to open this project on a physical device'));
    log(`${tc.underline('Android devices')}: scan the above QR code.`);
    log(
      `${tc.underline('iOS devices')}: run ${tc.bold(
        'exp send -s <your-phone-number-or-email>'
      )} in this project directory in another terminal window to send the URL to your device.`
    );

    // NOTE(brentvatne) Uncomment this when we update iOS client
    // log(
    //   `Alternatively, sign in to your account (${tc.bold(
    //     user.username
    //   )}) in the latest version of the Expo client on your iOS or Android device. Your projects will automatically appear in the "Projects" tab.`
    // );
  }

  log.newLine();
  log(tc.bold('Instructions to open this project on a simulator'));
  log(
    `If you already have the simulator installed, run ${tc.bold('exp ios')} or ${tc.bold(
      'exp android'
    )} in this project directory in another terminal window.`
  );
  log.newLine();
}
