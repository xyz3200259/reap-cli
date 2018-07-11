const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const shell = require('shelljs');
const inquirer = require('inquirer');
const ora = require('ora');
const download = require('download-git-repo');
const which = require('which');
const ejs = require('ejs');
const exists = require('fs').existsSync;
const mv = require('mv');
const ncp = require('ncp').ncp;
const recursive = require("recursive-readdir");
const npms = ['tnpm', 'cnpm', 'npm'];
const fileExtensions = ['*.md', '*.eot', '*.svg', '*.ttf', '*.woff'];
const cwd = process.cwd();
const origin = 'reap-platform/reap-boilerplate';
const branch = {
  standard: '#master'
};

function renderTemplate(groupId, targetPath, projectName) {
  recursive(path.join(targetPath, projectName), fileExtensions, function (err, files) {
    files.forEach((f) => {
      ejs.renderFile(f, {
        metadata: {
          artifactId: projectName,
          groupId
        }
      }, {}, (err, str) => {
        if(err) {
          console.log(chalk.red(`process file ${f} error happen`, err));
        } else {
          fs.writeFile(f, str);
        }
      });

    })
  });
}

function renamePackage(groupId, targetPath, projectName) {
  const srcDir = path.join(targetPath, projectName, 'src/main/java/${metadata.groupId}');
  const destSrcDir = path.join(targetPath, projectName, `src/main/java/${groupId.split('.').join('/')}`);
  fs.mkdirsSync(path.join(destSrcDir, '..'));
  const testDir = path.join(targetPath, projectName, 'src/test/java/${metadata.groupId}');
  const destTestDir = path.join(targetPath, projectName, `src/test/java/${groupId.split('.').join('/')}`);
  fs.mkdirsSync(path.join(destTestDir, '..'));
  fs.renameSync(srcDir, destSrcDir);
  fs.renameSync(testDir, destTestDir);
}

function findNpm() {
  for (var i = 0; i < npms.length; i++) {
    try {
      which.sync(npms[i]);
      console.log('use npm: ' + npms[i]);
      return npms[i];
    } catch (e) {}
  }
  throw new Error('please install npm');
}

module.exports = function (args) {

  const autoInstall = !(args[3] === '--no-auto-install');

  const questions = [
    {
      type: 'input',
      name: 'groupId',
      message: 'Input Group Id（ e.g com.xyz.xxx）:'
    }, {
      type: 'input',
      name: 'artifactId',
      message: 'Input Artifact Id（e.g reap-app）:'
    }, {
      type: 'input',
      name: 'path',
      message: 'which directory do you want to init to ? (default is current directory ./):'
    }
  ];

  const newType = 'standard';

  inquirer
    .prompt(questions)
    .then(function (answers) {

      const projectName = answers.artifactId || 'reap-template';
      const groupId = answers.groupId || 'org.reap';
      const targetPath = path.join(cwd, answers.path || './');

      if (exists(path.join(targetPath, projectName))) {
        console.log(chalk.red('exit: directory is already exists'));
        return;
      }

      const spinner = ora('downloading template...');
      spinner.start();

      function  doGenerateNewProject() {
        console.log(chalk.green(`Success to download repo https://github.com/${origin}${branch[newType]} to ${targetPath}`));
        renamePackage(groupId, targetPath, projectName);
        renderTemplate(groupId, targetPath, projectName);
        if (!autoInstall) {
          return;
        }
        const spinnerInstall = ora('Auto installing...');
        spinnerInstall.start();
        const npm = findNpm();
        shell.exec(`cd ${path.join(targetPath, `${projectName}/src/web`)} && ${npm} install`, function () {
          console.log(chalk.green(npm + ' install end'));
          spinnerInstall.stop();
        });
      }

      download(`${origin}${branch[newType]}`, path.join(targetPath, projectName), {
        clone: false
      }, function (err) {
        spinner.stop();
        if (err) {
          console.log(chalk.red(`Failed to download repo https://github.com/${origin}${branch[newType]}`, err));
          console.log(chalk.green('Switch using local boilerplate'));
          ncp(path.join(__dirname,'../boilerplate/local/'), path.join(targetPath, projectName),function (err){
            if(err){
              console.log(chalk.red('Failed to copy local boilerplate', err))
            } else {
              doGenerateNewProject();
            }
          });
        } else {
          doGenerateNewProject();
        }
      })
    });
};
