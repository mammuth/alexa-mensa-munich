const fs = require('fs');
const path = require('path');

const canteens = require('../src/canteens.js');

const CANTEEN_SLOT_FILE = path.join(__dirname, '../speechAssets', 'customSlot_CANTEEN.txt');

const slotString = canteens.map(canteen => canteen.synonyms.join('\n')).join('\n');
console.log(slotString);
fs.writeFileSync(CANTEEN_SLOT_FILE, slotString, 'utf-8');