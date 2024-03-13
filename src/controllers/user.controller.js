import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";
import jwt from 'jsonwebtoken'


const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
   const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    //add refreshtoken before return it and save it in database without validating
    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave:false})
    return {accessToken, refreshToken}
  } catch (error) {
    throw new apiError(500, "something went wrong while generating access token and refresh token");
  }

}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    try {
        const { username, email, fullname, password } = req.body;
    
        if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
          throw new apiError(400, "All fields are required");
        }
    
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });

        if (existingUser) {
          throw new apiError(409, "User already exists with this email or username");
        }

        const avtarLocalPath = req.files?.avatar?.[0]?.path;
        const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
      //   console.log(req.files);
    
        if (!avtarLocalPath) {
          throw new apiError(400, "Avatar file is required");
        }
    
        const avatar = await uploadFileOnCloudinary(avtarLocalPath);
        const coverImage = await uploadFileOnCloudinary(coverImageLocalPath);
    
        if (!avatar) {
          throw new apiError(400, "Failed to upload avatar file");
        }
    
        const user = await User.create({
          fullname,
          avatar: avatar.url,
          coverImage: coverImage?.url || "",
          email,
          password,
          username: username.toLowerCase()
        });
    
        
        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
          )
            
          if (!createdUser) {
            throw new apiError(500, "Something went wrong while registering user");
          }

        return res.status(201).json(
              new apiResponse(200, createdUser, "User created successfully")
          );
    } catch (error) {
        return res.status(error.statusCode || 500).json(new apiResponse(error.statusCode || 500, null, error.message));
    }
  });


const loginUser = asyncHandler( async (req, res) => {
  //take data from user/frontend 
  //username or email
  //check if the given user data is empty or not
  //find user
  //check password
  //access token and refresh token
  //send cookie

  const {username , password, email} = req.body;

    if(!email && !username) {
      throw new apiError(400, "username or email is required!")
    }

    const user = await User.findOne({
     $or: [{email}, {username}]
    });

    if(!user) {
      throw new apiError(404, "user not exist!")
    }

    const isPasswordVerified = await user.isPasswordCorrect(password);

    if(!isPasswordVerified) {
      throw new apiError(401, "Password is not correct");
    }

    //here generate access token and refresh roken
    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

    //here again extract user detail becuse in previous one accessToken and refreshToken are not present and from here remove the unneccesary one
    const loggedIn = await User.findOne(user._id).select("-password -refreshToken");

    //send cookies 
    const options = {
      httpOnly:true,
      secure:true
    }

    return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new apiResponse(200, {
                user:loggedIn, 
                accessToken, 
                refreshToken,
                message:"User logedIn successfully"
              }))
 
})


const logoutUser = asyncHandler (async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
          $set:{
            refreshToken:1
          }
        },
        {
          new:true
        }
    )

    const options = {
      httpOnly:true,
      secure:true
    }

    return res
          .status(200)
          .clearCookie("accessToken", options)
          .clearCookie("refreshToken", options)
          .json(new apiResponse(200, {}, "user logged out successfully"))
}) 


const refreshAccessToken = asyncHandler(async (req, res) => {
  //refresh tken from cookies or get from user
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if(!incomingRefreshToken) {
    throw new apiError(401, "unauthorized request")
  }

 try {
  //decoded incoming token and extract user id
   const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
 
   //find user on the basisi of id
   const user = await User.findById(decodedToken?._id)
 
   if(!user) {
     throw new apiError(401, "Invalid refresh token")
   }
   
   //check the token which is given by user on pressent is database is same?
   if(incomingRefreshToken !== user?.refreshToken){
     throw new apiError(401, "Refresh token is expired or used")
   }
 
   const options = {
     httpOnly:true,
     secure:true
   }
 
   const {accessToken, newRefreshToken} = await generateAccessTokenAndRefreshToken(user._id)
 
   return res
           .status(200)
           .cookie("accessToken", accessToken, options)
           .cookie("refreshToken", newRefreshToken, options)
           .json(
            new apiResponse(200,
            {
              accessToken, 
              refreshToken:newRefreshToken
            },
            "Access Token refreshed"))
 } catch (error) {
  throw new apiError(401, error?.message || "Invalid refresh token")
 }

})


const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword} = req.body;
  //user can change password if he/she is login so, take user from req(using authmiddleware)
  const user = await User.findById(req.user?._id)

  //check if the given oldPassword is correct or not. for that I have a function declared in userModel (isPasswordCorrect)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if(!isPasswordCorrect) {
    throw new apiError(400, "Invalid password")
  }

  //update the password and save the password.
  user.password = newPassword;
  await user.save({validateBeforeSave:false})  

  return res
          .status(200)
          .json(new apiResponse(200, {}, "Password changed successfully"));
})


const getCurrentUser = asyncHandler(async (req, res) => {
   return res
            .status(200)
            .json(new apiResponse(200, req.user, "Current user fetched successfully"))
})
  

const updateAccountDetail = asyncHandler(async (req, res) => {
    //take feilds from user which you want to update
    const {email, fullname} = req.body;
    if(!email || !fullname) {
      throw new apiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
      req.user._id, 
      {
        $set:{
          fullname:fullname,
          email:email,
        }
      },
      {
        new:true
      }
    ).select("-password")

    return res
            .status(200)
            .json(new apiResponse(200, user, "Account details updated successfully"));
})


const updateAvatar = asyncHandler(async (req, res) => {
  //upload file. if file store path of file in server.
  const avtarLocalPath = req.file?.path;
  if(!avtarLocalPath) {
    throw new apiError(400, "Avatar file is missing")
  }

  //upload it in cloud
  const avatar = await uploadFileOnCloudinary(avtarLocalPath);
  if(!avatar?.url){
    throw new apiError(400, "Error while uploading updated avatar in cloud")
  }

  //set the changes
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        avatar:avatar?.url
      }
    },
    {
      new:true
    }
    ).select("-password")

  return res
          .status(200)
          .json(new apiResponse(200, user, "Avatar updated successfully"))

})



const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if(!coverImageLocalPath) {
    throw new apiError(400, "coverImage is missing")
  }

  const coverImage = await uploadFileOnCloudinary(coverImageLocalPath)

  if(!coverImage?.url) {
    throw new apiError(400, "Error while uploading updated coverImage in cloud")
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        coverImage:coverImage?.url
      }
    },
    {
      new:true
    }
  ).select("-password")

  return res
          .status(200)
          .json(new apiResponse(200, user, "CoverImage updated successfully"))
})


export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetail, updateAvatar, updateCoverImage };
  