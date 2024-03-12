import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs'
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ,
  api_key: process.env.CLOUDINARY_API_KEY ,
  api_secret: process.env.CLOUDINARY_API_SECRET 
});


const uploadFileOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
       const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type:'auto'
        })

        //file uploaded successfully
        // console.log("file uploaded successfuly on cloud", response.url);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)  //remove the locally saved temporary files as upload operation get failed.
    }
}

export {uploadFileOnCloudinary}