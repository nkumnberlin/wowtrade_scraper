export const dropTableItemSQL = "DROP TABLE IF EXISTS wow_trade_webscraper";
export const createItemTable = `CREATE TABLE wow_trade_webscraper  (
  id INT PRIMARY KEY,
  id_crafted_item INT,
  item_name VARCHAR(255),
  id_recipe INT
)`;
export const insertQuery = `INSERT IGNORE INTO wow_trade_webscraper (id, id_crafted_item, item_name, id_recipe) VALUES (?, ?, ?, ?)`;

export const SelectAllItems = `SELECT * FROM wow_trade_webscraper`;
