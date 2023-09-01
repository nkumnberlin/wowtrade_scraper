//@ts-nocheck
import IDBCCraftingData from "./types/IDBCCraftingData";
import { MongoClient } from "mongodb";
import ICraftingData from "./types/ICraftingData";
import * as dotenv from "dotenv";

const cratedItemsMongo = require("./assets/craftedItems.json");

import mysql from "mysql2/promise";
import {
  createItemTable,
  dropTableItemSQL,
  insertQuery,
  SelectAllItems,
} from "./sql";

dotenv.config();

const axios = require("axios");
const craftedData = require("./assets/craftingData.json");

const url = `mongodb+srv://${process.env.ACC}:${process.env.PW}@crafteditemsdb.kp6faxe.mongodb.net/craftedItemsDB?retryWrites=true&w=majority`;
const collectionName = "craftedItems";

const fetchWoWHead = async (id: number) => {
  const response = await axios.get(`https://www.wowhead.com/item=${id}`);
  const { path } = response.request;

  // need to find out profession // skill // profession
  // /item=204217/unstable-elementium
  // [ '', 'item=204217', 'unstable-elementium' ]
  const name = path.split("/")[2];
  if (name?.includes("item")) {
    // throw new Error(`item wasnt found item id:${id}, name: ${name}`);
    console.log(`item wasnt found item id:${id}, name: ${name}`);
  }
  if (!name?.includes("item") && !name?.includes("zzOld")) {
    return name;
  }
};

async function fetchWoWHeadData(craftingData: IDBCCraftingData[]) {
  console.log("need to fetch: ", craftingData.length);
  const dbcCraftingDataResult = await Promise.all(
    craftingData.map(async (data, index) => {
      if (data.id_crafted_item === 0) return;
      if (data.id_crafted_item === undefined) return;
      await setTimeout(() => {}, 500);
      const name = await fetchWoWHead(data.id_crafted_item);
      await setTimeout(() => {}, 500);

      console.log("Nr. ", index, " von ", craftingData.length, name);
      return {
        id: data.id,
        id_crafted_item: data.id_crafted_item,
        item_name: name,
      };
    })
  );
  const noUndefined = dbcCraftingDataResult.filter(
    (data) => data !== undefined
  );
  return noUndefined as ICraftingData[];
}

async function addDataToMongo(craftingDataResult: ICraftingData[]) {
  try {
    const client = await MongoClient.connect(url);
    const database = client.db();
    // find all
    const mongoCollection = await database.collection(collectionName);
    const result = await mongoCollection.find({}).toArray();
    const newItems = craftingDataResult.filter(
      (item) =>
        !result.some(
          (existingItem) => existingItem.item_name === item.item_name
        )
    );

    if (newItems.length > 0) {
      console.log("new item length ", newItems.length);
      await mongoCollection
        .insertMany(newItems)
        .then(async (success) => {
          console.log(
            `Inserted ${success.insertedCount} new items into the database.`
          );
          await client.close();
        })
        .catch((error) => console.log("has error ", error));
    } else {
      console.log("No new item to insert.");
      await client.close();
    }

    await client.close();
  } catch (e) {
    console.log("Fehler: ", e);
  }
}

async function getDataForTestingFromPlanetScale() {
  const tableName = "wow_trade_webscraper";

  const connection = await mysql.createConnection(url);
  try {
    const url = process.env.DATABASE_URL || "";
    // Get a connection from the pool

    const [results] = await connection.query(SelectAllItems);
    console.log(results);

    // Release the connection back to the pool
  } catch (error) {
    console.log("Fehler: ", error);
  } finally {
    await connection.end();
  }
}
async function addDataToPlanetScale(craftingDataResult: ICraftingData[]) {
  const tableName = "wow_trade_webscraper";

  try {
    const url = process.env.DATABASE_URL || "";
    // Get a connection from the pool
    const connection = await mysql.createConnection(url);

    // drop table
    await connection.query(dropTableItemSQL);
    // create table if not exist
    await connection.query(createItemTable);
    // Find all
    const selectQuery = `SELECT * FROM ${tableName}`;
    const [rows] = await connection.execute(selectQuery);
    const result = rows;

    // Assuming craftingDataResult contains your crafting data
    const newItems = craftingDataResult.filter(
      (item) =>
        !result.some(
          (existingItem) => existingItem.item_name === item.item_name
        )
    );

    if (newItems.length > 0) {
      console.log("new item length ", newItems.length);
      const values = newItems.map((item) => [
        item.id,
        item.id_crafted_item || 0,
        item.item_name || "",
        item.id_recipe_item || 0,
      ]);
      // Execute insert query
      for (const item of values) {
        console.log("item ", item);
        try {
          await connection.query(insertQuery, item);
        } catch (e) {
          console.log("error");
          await connection.end();
        }
      }
    } else {
      console.log("No new item to insert.");
    }
    // Release the connection back to the pool
    await connection.end();
  } catch (error) {
    console.log("Fehler: ", error);
  }
}

async function main() {
  // const craftingData: IDBCCraftingData[] = craftedData;
  // const craftingDataResult = await fetchWoWHeadData(craftingData);
  // iteriere ueber die 10 professionjson und ziehe die recipe ids raus und weise den mathces diese zu
  // await addDataToMongo(craftingDataResult);
  await addDataToPlanetScale(cratedItemsMongo);
  // await getDataForTestingFromPlanetScale();
}

main();
