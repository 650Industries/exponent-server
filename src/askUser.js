import inquirerAsync from 'inquirer-async';

import {
  UserSettings,
} from 'xdl';

async function askForSendToAsync() {
  var sendToFromSettings = await UserSettings.getAsync('sendTo', null);
  console.log("Enter a mobile number or e-mail and we'll send a link to your phone.");
  var answers = await inquirerAsync.promptAsync([{
    type: 'input',
    name: 'sendTo',
    message: "Your mobile number or e-mail" + (sendToFromSettings ? " (space to not send anything)" : '') + ":",
    default: sendToFromSettings,
  }]);
  let recipient = answers.sendTo.trim();
  await UserSettings.mergeAsync({sendTo: recipient});
  return recipient;
}

export default {
  askForSendToAsync,
};

if (require.main === module) {
  askForSendToAsync().then(function (sendTo) {
    console.log("Your mobile number or email is", sendTo);
  });
}
