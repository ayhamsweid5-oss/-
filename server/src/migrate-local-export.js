// Converts a browser localStorage export into SQL-ready JSON without deleting the source data.
const fs=require('fs');
const input=process.argv[2]||'local-export.json';
const source=JSON.parse(fs.readFileSync(input,'utf8'));
const output={products:source.products||[],transactions:source.transactions||[],contacts:source.contacts||[]};
fs.writeFileSync(process.argv[3]||'migration-data.json',JSON.stringify(output,null,2));
console.log(`Prepared ${output.products.length} products, ${output.transactions.length} transactions and ${output.contacts.length} contacts.`);
