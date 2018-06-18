const path = require('path');
const ejs = require('ejs');
const chalk = require('chalk');
const fs = require('fs-extra');
const exists = require('fs').existsSync;
const inquirer = require('inquirer');
const cwd = process.cwd();

function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function renderTeamplate(template, data, target) {
  ejs.renderFile(template, data, {}, (err, str) => {
    if (err) {
      console.log(chalk.red(`render template  ${f} error happen`, err));
    } else {
      ensureDirectoryExistence(target);
      fs.writeFileSync(target, str, 'utf-8');
    }
  });
}

function getPath() {
  if (exists(path.join(cwd, './package.json'))) {
    return 'webRoot';
  }
  if (exists(path.join(cwd, './components'))) {
    return 'src';
  }
  if (exists(path.join(cwd, './pom.xml'))) {
    return 'root';
  }
  return '';
}

function generateUnderTargetPath(callback, type) {

  function q() {
    const questions = [
      {
        type: 'input',
        name: 'target',
        message: 'which path do you want to create template to ? (default is current directory ./)' +
          ': '
      }
    ];

    inquirer
      .prompt(questions)
      .then(function (answers) {
        if (callback) {
          callback(path.join(cwd, answers.target || './'));
        }
      });
  }

  const currentPath = getPath();

  if (currentPath === 'root' && type) {
    try {
      switch (type) {
        case 'function':
          callback(path.join(cwd, './src/web/src/'));
          break;
        case 'api':
          callback(path.join(cwd, './src/web/src/apis/'));
          break;
        default:
          break;
      }
    } catch (e) {
      q();
    }
  } else if (currentPath === 'webRoot' && type) {
    try {
      switch (type) {
        case 'function':
          callback(path.join(cwd, './src/'));
          break;
        case 'api':
          callback(path.join(cwd, './src/apis/'));
          break;
        default:
          break;
      }
    } catch (e) {
      q();
    }

  } else if (currentPath === 'src' && type) {
    try {
      switch (type) {
        case 'function':
          callback(cwd);
          break;
        case 'api':
          callback(path.join(cwd, './apis/'));
          break;
        default:
          break;
      }
    } catch (e) {
      q();
    }

  } else {
    q();
  }
}

function chooseType() {
  const questions = [
    {
      type: 'list',
      name: 'type',
      message: 'what do you want to generate ?',
      choices: ['function', 'api']
    }
  ];

  inquirer
    .prompt(questions)
    .then(function (answers) {
      switch (answers.type) {
        case 'function':
          func();
          break;
        case 'api':
          api();
          break;
        default:
          break;
      }
    });
}

function func() {
  const questions = [
    {
      type: 'input',
      name: 'name',
      message: 'func name（`4位系统编码+2位模块代码+4位数字序号` e.g: REAPBO0001）:'
    }
  ];

  inquirer
    .prompt(questions)
    .then(function (answers) {

      const name = answers.name;

      generateUnderTargetPath((target) => {
        try {
          renderTeamplate(path.join(__dirname,'../boilerplate/blank/model.ejs'), {}, `${target}/models/${name}.js`);
          console.log(chalk.green(`generated model ${name} success：${target}/models/${name}.js`));
          renderTeamplate(path.join(__dirname,'../boilerplate/blank/route.ejs'), {}, `${target}/routes/${name}.js`);
          console.log(chalk.green(`generated route ${name} success：${target}/routes/${name}.js`));
        } catch (e) {
          console.log(chalk.red(`generated function ${name} fail`, e));
        }
      }, 'function');
    });
}

function api() {
  const questions = [
    {
      type: 'input',
      name: 'name',
      message: 'api name:'
    }
  ];

  inquirer
    .prompt(questions)
    .then(function (answers) {
      const name = answers.name;
      generateUnderTargetPath(function (target) {
        try {
          renderTeamplate(path.join(__dirname,'../boilerplate/api.ejs'),{},`${target}/${name}.js`);
          console.log(chalk.green(`generated api ${name} success：${path.join(target, name + '.js')}`));
        } catch (e) {
          console.log(chalk.red(`generated api ${name} fail`, e));
        }
      }, 'service');
    });
}

module.exports = function (args) {
  const type = args[3];
  if (!type) {
    chooseType();
    return;
  }

  switch (type) {
    case 'function':
      func();
      break;
    case 'api':
      api();
      break;
    default:
      console.log(chalk.red('none of this type'));
      chooseType();
      break;
  }
};