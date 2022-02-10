const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient } = require('mongodb');
const port = process.env.PORT || 5000;
require('dotenv').config();
var admin = require("firebase-admin");

// middleware
var serviceAccount = require("./z-4-ema-john-client-firebase-adminsdk-goz9c-626734d0f9.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ucfjq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith("Bearer ")) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decodeUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodeUser.email;
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('online_shop');
        const productCollection = database.collection('products');
        const orderCollection = database.collection('orders');

        // GET Products API
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({});
            const count = await cursor.count();
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
                // skip(20) // প্রথম 20টার পরথেকে বাকি গুলা দিবে।
                // limit(10) // প্রথম 10 টা প্রোডাক্ত দিবে। বা skip এর পরথেকে 10 টা দিবে
            }
            else {
                products = await cursor.toArray();
            }
            res.send({
                count,
                products
            });
        });

        // use post to get data by keys
        app.post('/products/byKeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } }
            const products = await productCollection.find(query).toArray();
            res.json(products);
        });

        // Add orders API
        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;
            if (req.decodedUserEmail === email) {
                const query = { email: email };
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                res.json(orders);
            }
            else {
                res.status(401).json({ message: 'User not authorized' });
            }
        })
        app.post('/orders', async (req, res) => {
            const order = req.body;
            order.createdAt = new Date();
            const result = await orderCollection.insertOne(order);
            res.json(result)
        })
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('retry angain')
})

app.listen(port, () => {
    console.log('listening port: ', port)
})