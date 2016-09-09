import inquirerAsync from 'inquirer-async';

import {
  Exp,
} from 'xdl';

import log from '../log';

async function action(projectDir, options) {
  let warning = [
    {
      type: 'confirm',
      name: 'confirmed',
      message: `Warning: we are going to modify your package.json, delete your node_modules directory, and modify your .babelrc file (or create if you do not have one). Are you OK with this?\n`,
    },
  ];
  let { confirmed } = await inquirerAsync.promptAsync(warning);

  if (!confirmed) {
    log(`OK, aborted. You can do this process manually by creating a new project with \`exp init\` and copying in the files that you need.`);
    return;
  }

  let gitWarning = [
    {
      type: 'confirm',
      name: 'gitConfirmed',
      message: `Have you committed any important changes to your project to git, so you can rollback if necessary?\n`,
    },
  ]

  let { gitConfirmed } = await inquirerAsync.promptAsync(gitWarning);

  if (!gitConfirmed) {
    log('Well I am glad that we asked! Commit your changes and run `exp convert` again when you are ready.');
  }

  if (!confirmed || !gitConfirmed) {
    return;
  }

  let questions = [
    {
      type: 'input',
      name: 'projectName',
      message: 'What is your project name? eg: Instagram for Cats\n',
      validate(val) {
        return val.length > 0;
      },
    },
    {
      type: 'input',
      name: 'projectDescription',
      message: 'Please provide a short description of your project (optional, used for your landing page, eg: Finally your cat can post selfies in a welcoming community of other cats, no dogs allowed)\n',
    },
    {
      type: 'input',
      name: 'projectEntryPoint',
      message: 'Which file is the main entry point to your project? (if it is the standard index.android.js / index.ios.js, just press enter)\n',
    },
  ];

  let answers = await inquirerAsync.promptAsync(questions);
  await Exp.convertProjectAsync(projectDir, answers, log);
}

export default (program) => {
  program
    .command('convert [project-dir]')
    .alias('onentize')
    .description('Initialize Exponent project files within an existing React Native project')
    .asyncActionProjectDir(action);
};
