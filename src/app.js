import express, { urlencoded } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express();
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

//json format data like through form
app.use(express.json({limit:"16kb"}))

//url format
app.use(urlencoded({extended:true, limit:"16kb"}))    ///extended use for nested object.

app.use(express.static("public"))    //static is use to store public assests if required
app.use(cookieParser())      //cookieParser is used to get the cookies from users browsser and also set the cookies to users browser. and that cookies are are secured because that are only read by server and the only server can perform crud operation on it.


//router import
import userRouter from "./routes/user.route.js"


//router declaration
app.use("/api/v1/users", userRouter)



export {app}