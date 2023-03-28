import IDBCCraftingData from "./types/IDBCCraftingData";
import {MongoClient} from 'mongodb';
import ICraftingData from "./types/ICraftingData";

const axios = require('axios')
const craftedData = require('./assets/craftingData.json')

const url = 'mongodb+srv://admin:SpozQMGIiUDNJKu9@crafteditemsdb.kp6faxe.mongodb.net/craftedItemsDB?retryWrites=true&w=majority';
const collectionName = 'craftedItems';

const fetchWoWHead = async (id: number) => {
    const response = await axios
        .get(`https://www.wowhead.com/item=${id}`)
    const {path} = response.request;

    // need to find out profession // skill // profession
    // /item=204217/unstable-elementium
    // [ '', 'item=204217', 'unstable-elementium' ]
    const name = path.split('/')[2];
    if (name?.includes('item')) {
        // throw new Error(`item wasnt found item id:${id}, name: ${name}`);
        console.log(`item wasnt found item id:${id}, name: ${name}`);
    }
    if (!name?.includes('item') && !name?.includes('zzOld')) {
        return name
    }
}

async function fetchWoWHeadData(craftingData: IDBCCraftingData[]) {
    console.log('need to fetch: ', craftingData.length)
    const dbcCraftingDataResult = await Promise.all(craftingData.map(async (data, index) => {
        if (data.id_crafted_item === 0) return
        if (data.id_crafted_item === undefined) return;
        await setTimeout(() => {
        }, 500)
        const name = await fetchWoWHead(data.id_crafted_item)
        await setTimeout(() => {
        }, 500)

        console.log('Nr. ', index, ' von ', craftingData.length, name)
        return {
            id: data.id,
            id_crafted_item: data.id_crafted_item,
            item_name: name
        }

    }))
    const noUndefined = dbcCraftingDataResult.filter((data) => data !== undefined);
    return noUndefined as ICraftingData[];
}


async function addDataToMongo(craftingDataResult: ICraftingData[]) {
    try {
        const client = await MongoClient.connect(url)
        const database = client.db();
        // find all
        const mongoCollection = await database.collection(collectionName);
        const result = await mongoCollection.find({}).toArray();
        const newItems = craftingDataResult.filter(item => !result.some(existingItem => existingItem.item_name === item.item_name));

        if (newItems.length > 0) {
            console.log('new items length ', newItems.length)
            await mongoCollection.insertMany(newItems).then(async (success) => {
                console.log(`Inserted ${success.insertedCount} new items into the database.`);
                await client.close();
            }).catch((error) => console.log('has error ', error))
        } else {
            console.log('No new items to insert.');
            await client.close();
        }

        await client.close();
    } catch (e) {
        console.log('Fehler: ', e)
    }

}


async function main() {
    const craftingData: IDBCCraftingData[] = craftedData;
    const craftingDataResult = await fetchWoWHeadData(craftingData);
    await addDataToMongo(craftingDataResult)
}

main()
