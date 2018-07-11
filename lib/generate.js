const path = require('path');
const ejs = require('ejs');
const chalk = require('chalk');
const fs = require('fs-extra');
const exists = require('fs').existsSync;
const inquirer = require('inquirer');
const cwd = process.cwd();

const FIELD_TYPES = ['String', 'Integer', 'Long', 'Date','Timestamp', 'BigDecimal'];

String.prototype.firstUpperCase=function(){
    return this.replace(/^\S/,function(s){return s.toUpperCase();});
}

String.prototype.firstLowerCase=function(){
  return this.replace(/^\S/,function(s){return s.toLowerCase();});
}


function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function renderTeamplate(template, data, target, append) {
  ejs.renderFile(template, data, {}, (err, str) => {
    if (err) {
      console.log(chalk.red(`render template  ${f} error happen`, err));
    } else {
      ensureDirectoryExistence(target);
      if(append) {
        fs.appendFileSync(target, str, 'utf-8');
      } else {
        fs.writeFileSync(target, str, 'utf-8');
     }
    }
  });
}

function getPath() {
  if (exists(path.join(cwd, './package.json'))) {
    return 'webRoot';
  }
  if (exists(path.join(cwd, './pom.xml'))) {
    return 'root';
  }
  return '';
}

function generateUnderTargetPath(callback, type) {

  const currentPath = getPath();

  if (currentPath === 'root' && type) {
    try {
      switch (type) {
        case 'blank':
          callback(path.join(cwd, './src/web/src/'));
          break;
        case 'crud':
          callback(path.join(cwd, './src/web/src/'), path.join(cwd, './src/'));
          break;
        default:
          break;
      }
    } catch (e) {
      console.log(chalk.red(`generate ${type} fail !`, e ));  
    }
  } else if (currentPath === 'webRoot' && type) {
    try {
      switch (type) {
        case 'blank':
          callback(path.join(cwd, './src/'));
          break;
        case 'crud':
          callback(path.join(cwd, './src/'), path.join(cwd, '../../src/'));
          break;
        default:
          break;
      }
    } catch (e) {
      console.log(chalk.red(`generate ${type} fail !`, e ));  
    }

  } else {
    console.log(chalk.red('pom.xml or package.json not found under path!'));
  }
}



function blank() {
  const questions = [
    {
      type: 'input',
      name: 'code',
      required: true,
      message: '请输入功能码（`4位系统编码+2位模块代码+4位数字序号` e.g: REAPBO0001）:',
      validate: (input) => {
        if(input){
          return true;
        } else {
          return '功能码必输!';
        }
      } 
    },{
      type: 'input',
      name: 'name',
      message: '请输入功能码名称（Pascal-style）:',
      validate: (input) => {
        if(input){
          return true;
        } else {
          return '功能名称必输!';
        }
      } 
    }
  ];

  inquirer
    .prompt(questions)
    .then(function (answers) {
      const code = answers.code;
      const name = answers.name;
      if(!code) {
        console.log(chalk.red(`generated function ${name} fail`, e));
      }
      generateUnderTargetPath((target) => {
        try {
          const functions = JSON.parse(fs.readFileSync(path.join(target,'functions.json'), 'utf8'));
          const exist = functions.find(f=>f.code === code);
          if(exist){
            exist.name = name;
          } else {
            functions.push({code,name,description:''});
          }
          renderTeamplate(path.join(__dirname,'../boilerplate/functions.ejs'), {functions}, `${target}/functions.json`);
          renderTeamplate(path.join(__dirname,'../boilerplate/blank/model.ejs'), {}, `${target}/models/${name}.js`);
          console.log(chalk.green(`generated model ${name} success：${target}/models/${name}.js`));
          renderTeamplate(path.join(__dirname,'../boilerplate/blank/route.ejs'), {}, `${target}/routes/${name}.js`);
          console.log(chalk.green(`generated route ${name} success：${target}/routes/${name}.js`));
        } catch (e) {
          console.log(chalk.red(`generated function ${name} fail`, e));
        }
      }, 'blank');
    });
}

function chooseType(cb) {
  const questions = [
    {
      type: 'list',
      name: 'type',
      message: 'what do you want to generate ?',
      choices: ['blank', 'crud']
    }
  ];

  let type = null;
  inquirer
    .prompt(questions)
    .then(function (answers) {
      cb(answers.type)
    });
}

function crud() {
  const questions = [
    {
      type: 'input',
      name: 'code',
      message: '请输入功能码（`4位系统编码+2位模块代码+4位数字序号` e.g: REAPBO0001）:'
    },{
      type: 'input',
      name: 'name',
      message: '请输入功能码名称（Pascal-style）:'
    },
  ];

  inquirer
    .prompt(questions)
    .then(function (answers) {
      const code = answers.code;
      const name = answers.name;
      const packageName = name.firstUpperCase();
      generateUnderTargetPath((target) => {
        const metataPath = `${path.join(target,`../generation/${packageName}.json`)}`
        if(!fs.existsSync(metataPath)){
          console.log(chalk.red(`Metadata file required ${metataPath} detail usage ref ${path.join(target,`../generation/README.md`)}`));
          return; 
        }
        const data = JSON.parse(fs.readFileSync(metataPath, 'utf8'));
        if(!data.fields.find(f=>f.primaryKey)){
           data.fields.push({key:'id',name:'ID',type:'String', primaryKey: true})
        }
        data.fields.forEach(f =>{
          if(!f.type){
            f.type = 'String'
          }
          if(!FIELD_TYPES.includes(f.type)){
            console.log(chalk.red(`Unknow type ${f.type} for field ${f.name} definition.`));
            process.exit(1);
          }
        });
        const metadata = {
          entity: {
            fields: data.fields,
            name: packageName,
          }
        }

        const packageJson = JSON.parse(fs.readFileSync(path.join(target,'../package.json'), 'utf8'));
        metadata.groupId= packageJson && packageJson.groupId || 'org.reap'
        metadata.systemCode = packageJson && packageJson.name || 'reap-sample'
        const packagePath = path.join(target,`../../main/java/${metadata.groupId.split('.').join('/')}`)
        const databasePath = path.join(target,`../../../database`)
        try {
          let functions = [];
          if(fs.existsSync(path.join(target,'functions.json'))){
            functions = JSON.parse(fs.readFileSync(path.join(target,'functions.json'), 'utf8'));
          } 
          const exist = functions.find(f=>f.code === code);
          if(exist){
            exist.name = name;
          } else {
            functions.push({code,name,description:''});
          }
          
          renderTeamplate(path.join(__dirname,'../boilerplate/functions.ejs'), {functions}, `${target}/functions.json`);

          renderTeamplate(path.join(__dirname,'../boilerplate/crud/frontend/model.ejs'), {metadata}, `${target}/models/${packageName}.js`);
          console.log(chalk.green(`generated model success：${target}/models/${packageName}.js`));

          renderTeamplate(path.join(__dirname,'../boilerplate/crud/frontend/api.ejs'), {metadata}, `${target}/apis/${packageName}.js`);
          console.log(chalk.green(`generated api success：${target}/apis/${packageName}.js`));

          renderTeamplate(path.join(__dirname,'../boilerplate/crud/frontend/route.ejs'), {metadata}, `${target}/routes/${packageName}.js`);
          console.log(chalk.green(`generated route success：${target}/routes/${packageName}.js`));
        
          renderTeamplate(path.join(__dirname,'../boilerplate/crud/frontend/list.ejs'), {metadata}, `${target}/components/${packageName}/List.js`);
          console.log(chalk.green(`generated list component success：${target}/components/${packageName}/List.js`));
          
          renderTeamplate(path.join(__dirname,'../boilerplate/crud/frontend/form.ejs'), {metadata}, `${target}/components/${packageName}/Form.js`);
          console.log(chalk.green(`generated form component success：${target}/components/${packageName}/Form.js`));

          renderTeamplate(path.join(__dirname,'../boilerplate/crud/backend/entity.ejs'), {metadata}, `${packagePath}/domain/${packageName}.java`);
          console.log(chalk.green(`generated entity success：${packagePath}/domain/${packageName}.java`));

          renderTeamplate(path.join(__dirname,'../boilerplate/crud/backend/repository.ejs'), {metadata}, `${packagePath}/domain/${packageName}Repository.java`);
          console.log(chalk.green(`generated repository success：${packagePath}/domain/${packageName}Repository.java`));

          renderTeamplate(path.join(__dirname,'../boilerplate/crud/backend/controller.ejs'), {metadata}, `${packagePath}/web/${packageName}Controller.java`);
          console.log(chalk.green(`generated controller success：${packagePath}/web/${packageName}Controller.java`));

          renderTeamplate(path.join(__dirname,'../boilerplate/crud/backend/table.ejs'), {metadata}, `${databasePath}/ddl.sql`,true);
          console.log(chalk.green(`generated table success: ${databasePath}/ddl.sql `));

        } catch (e) {
          console.log(chalk.red(`generated function ${name} fail`, e));
        }
      }, 'crud');
    });
}

module.exports = function (args) {
  let type = args[3];

 function generate(type) {
  switch (type) {
    case 'blank':
      blank();
      break;
    case 'crud':
      crud();
      break;
  }
 }

  if (!type) {
    chooseType((type)=>generate(type));
  } else {
    switch (type) {
      case 'blank':
        blank();
        break;
      case 'crud':
        crud();
        break;
      default:
        console.log(chalk.red('none of this type'));
        chooseType((type)=>generate(type));
        break;
    }
  }
};