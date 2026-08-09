// RealmDB persistence adapter for the upcoming Electron/Node runtime.
// The browser MVP continues using its existing StorageGateway until Electron loads this module.
const Realm = require('realm');

class Product extends Realm.Object {
  static schema = require('./realm.schema.json').objects[0];
}
class Transaction extends Realm.Object {
  static schema = require('./realm.schema.json').objects[1];
}

function openRealm(path = 'makhzani.realm') {
  return Realm.open({path, schema: [Product, Transaction], schemaVersion: 1});
}

module.exports = {Product, Transaction, openRealm};
