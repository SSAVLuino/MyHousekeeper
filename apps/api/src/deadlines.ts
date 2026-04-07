import express from 'express'; 
const r=express.Router(); 
r.get('/',(_,res)=>res.json([])); 
export default r;
