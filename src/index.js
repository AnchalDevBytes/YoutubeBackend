// require('dotenv').config({path: './env'})
import dotenv from 'dotenv'
import connectDB from './db/index.js'
import {app} from './app.js'


dotenv.config({
    path:'./.env'
})


connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on PORT: ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("Mongodb connection failed", err);
})





/* const app = express();

(async () => {
    try {
       await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
       app.on("error", (error) => {
        console.log("Err" +error);
        throw error;
       })

       app.listen(process.env.PORT || 4000, () => {
        console.log(`App is listening on ${process.env.PORT}`);
       })

    } catch (error) {
        console.error("Error" +error);
        throw error;
    }
})()
*/