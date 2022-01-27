const fs = require('fs');
const parseString = require('xml2js').parseString;
const redis = require('redis');

let redisHost = process.env.REDIS_HOST ? process.env.REDIS_HOST : "localhost";

console.log("XML Exporter started.");

handler().then(() => {
    console.log("Export completed successfully");
    process.exit();
}).catch((err) => {
    console.log("Problem occured during export: " + err);
    process.exit();
})

async function handler() {
    // Retrieve config file data 
    if (process.argv.length <= 2) {
        throw "XML file not provided.";
    }
    const xmlFilePath = process.argv[2];
    console.log("XML file path: " + xmlFilePath);
    const xmlData = await readXMLFile(xmlFilePath);
    console.log("Successfully read XML file.");
    const config = xmlData.config;

    // Connect to redis
    const client = await connectRedis();

    // Insert subdomains
    console.log("Inserting subdomains.");
    let subdomains = null;
    try {
        subdomains = config.subdomains[0]['subdomain'];
        await client.set('subdomains', JSON.stringify(subdomains));
    }
    catch (e) {
        throw "Error inserting subdomains: " + e;
    }
    console.log("Successfully inserted subdomains.");

    // Insert cookies
    console.log("Inserting cookies:");
    let cookies = null;
    try {
        cookies = config.cookies[0]['cookie'];
        for (const cookie of cookies) {
            const key = "cookie:" + cookie['$'].name + ":" + cookie['$'].host;
            const value = cookie['_'];
            await client.set(key, value)
        }
    }
    catch (e) {
        throw "Error inserting cookies: " + e;
    }
    console.log("Successfully inserted cookies.");
}

async function connectRedis() {
    console.log("Connecting to " + redisHost);
    const client = redis.createClient({
        socket: {
            host: redisHost,
            port: 6379,
        }
    });

    client.on('error', err => {
        console.log('Error ' + err);
        throw err;
    });

    await client.connect();

    console.log("Redis client connected.");
    return client;
}

function readXMLFile(xmlFilePath) {
    return new Promise(function (resolve, reject) {
        fs.readFile(xmlFilePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            }
            console.log("Data: " + data);
            parseString(data, function (err, result) {
                if (err) {
                    reject(err);
                }
                resolve(result);
            });
        });

    })
}