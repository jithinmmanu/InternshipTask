import express, { json } from 'express';
import { AdminRoute } from './Route/AdminRoute.js';
const app=express();
const port=3000;
//  app.use(json())
 app.use('/',AdminRoute)
app.listen(port,()=>{
    console.log(`port listening to ${port}`)
})
