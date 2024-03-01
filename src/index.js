// require('dotenv').config({path: './env'})
import dotenv from 'dotenv'
import db_connect from './db/index.js'


dotenv.config({
    path:'./env'
})




db_connect();













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