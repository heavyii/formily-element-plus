import { Engine } from '@designable/core'
import {
  transformToSchema,
  transformToTreeNode,
} from '@designable/formily-transformer'
import { ElMessage, ElMessageBox } from 'element-plus'
import Parse from 'parse';
import qs from 'query-string';

function buildQueryParam(objectId, className) {
  const token = btoa(JSON.stringify({
    serverUrl: Parse.serverURL,
    appId: Parse.applicationId,
    className: className || 'FormSchema',
    sessionToken: Parse.User.current().get('sessionToken')
  }))
  const queryStr = `id=${objectId}&token=${token}`;
  return { id: objectId, token, queryStr: queryStr };
}

async function getSchemaObject() {
  const { id, token } = qs.parse(window.location.search);
  const objectId = id as string;
  const { serverUrl,appId,className,sessionToken } = JSON.parse(atob(token as string));
  Parse.applicationId = appId;
  Parse.serverURL = serverUrl;
  // Parse.enableEncryptedUser();
  // Parse.enableLocalDatastore();
  if (sessionToken) {
    await Parse.User.become(sessionToken);
  }

  let formObj = new Parse.Object(className);
  formObj.id = objectId;
  return formObj;
}

export const schemaObjThenable = getSchemaObject();

export const saveSchema = (designer: Engine) => {
  schemaObjThenable.then(formObj => {
    const json = transformToSchema(designer.getCurrentTree());
    return formObj.save(json);
  }).then(() => {
    ElMessage.success('Save Success')
  }).catch(err => {
    ElMessage.error('Save failed')
  })
}

export const loadInitialSchema = (designer: Engine) => {
  schemaObjThenable.then(formObj => formObj.fetch())
    .then((formObj) => {
      const form = formObj.get('form');
      const schema = formObj.get('schema');
      const name = formObj.get('name');
      const tree = transformToTreeNode({ form, schema })
      designer.setCurrentTree(tree)
      ElMessage.info(name ? 'load ' + name : 'load success')
    }).catch(err => {
      ElMessage.error('load failed ' + err)
    });
}

export const saveAsNewSchema = (designer: Engine, name) => {
  schemaObjThenable.then(formObj => formObj.className)
    .then(className => {
      // create a JSON object
      const json = transformToSchema(designer.getCurrentTree());
      const formObj = new Parse.Object(className);
      return formObj.save({ ...json, name })
    }).then((formObj) => {
      return schemaObjThenable.then(oldObj => {
        const url = window.location.href.replace(oldObj.id, formObj.id);
        return url;
      })
    }).then(url => {
      ElMessageBox.confirm('保存成功，是否立即编辑?')
        .then(() => {
          window.location.href = url;
        })
        .catch(() => {
          // catch error
        })
    }).catch(err => {
      ElMessage.error('Save failed')
    })
}