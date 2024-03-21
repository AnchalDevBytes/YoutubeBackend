import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFileFromCloudinary, uploadFileOnCloudinary } from "../utils/cloudinary.js";
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

//TODOS: after successfully updating the avtaar, delete the previous one
  //get the current user's avatar url
  const currentUser = await User.findById(req.user._id).select("avatar");
  const currentAvatar = currentUser?.avatar

  //if uploaded successfully delete previous one
  if(currentAvatar) {
    await deleteFileFromCloudinary(currentAvatar)
  }


  //set the changes / update avatar
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

  const currentUser = await User.findById(req.user._id).select("coverImage")
  const currentCoverImage = currentUser?.coverImage

  if(currentCoverImage) {
    await deleteFileFromCloudinary(currentCoverImage);
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


const getUserChannelProfile = asyncHandler( async (req, res) => {
  //get username from params. and check if username exist in params or not. because when user hit n particular user then only you can see their profile in params.
  const {username} = req.params;

  if(!username?.trim()) {
    throw new apiError(400, "Username is missing")
  }

  // aggregation pipelining
  const channel = await User.aggregate([
    {
      $match:{
        username:username?.toLowerCase()
      }
    },
    //to find subscribers of particular channel. we count channel here to find subscriber. (channel ke subscriber kitne h)
    {
      $lookup:{
        from:"subscriptions",          //Subscription === subscriptions(in db) 
        localField:"_id",              //in locally we matched with _id
        foreignField:"channel",        // in foreign match with channel
        as:"subscribers"               //we callled it as subscribers
      }
    },
    //this lookups is to find that the channel is subscribing  to whom.(channel ne kitno ko subscribe kiya h)
    {
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo"
      }
    },
    //to add these feilds in user details
    {
      $addFields:{
        //count subscribers of channel and add
        subscriberCount : {
          $size:"$subscribers"
        },
        //count the channels which are subscribed by this channel and add
        channelSubscribedToCount: {
          $size:"$subscribedTo"
        },
        // to check wheteher we subscribed to particular channel or not.
        // check with condition if user able to see someone's channel profile that mean he/she hit a req so take user id from req and check in that channel subscribers, it found or not. if yes it goes to condition then else in else.  
        isSubscribed: {
          $cond: {
            if: {$in: [req.user?._id, "$subscribers.subscriber"]},
            then:true,
            else:false
          }
        }
      }
    },
    //anathor pipeline so that we can send only thosse data which are required in channel profile details.
    {
      $project:{
        username:1,
        fullname:1,
        subscriberCount:1,
        channelSubscribedToCount:1,
        isSubscribed:1,
        avatar:1,
        coverImage:1,
        email:1
      }
    }
  ])

  if(!channel?.length){
    throw new apiError(400, "Channel does not exist")
  }

  return res
          .status(200)
          .json(new apiResponse(200, channel[0], "User channel fetched successfully"))
})


const getWatchHistory = asyncHandler (async (req, res) => {
  const user = User.aggregate([
      {
        $match:{
          _id: new mongoose.Types.ObjectId(req.user._id)  //_id always return a string but it is nt considered as mongodb id, (Mongodb id consist the ObjectId('string id)) but from _id only string are found, so cnvert it into mongodb id
        },
        $lookup:{
          //now we are in user . after pipline, objects of videos are come. 
          from:"videos",
          localField:"watchHistory",
          foreignField:"_id ",
          as:"watchHistory",
          //this pipline is fr videos which is inside this
          pipeline:[
            {
              $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                //this pipeline is for extracting the data which are in use because it return a array in which all details of user are coming. 
                pipeline:[
                  {
                    $project:{
                      username:1,
                      fullname:1,
                      avatar:1
                    }
                  }
                ]
              }
            },
            // anathor piplines is for extracting the 0th index of array where data are present
            {
              $addFields:{
                //here all field are in owner so, override that owner array with its 0th index or first index to get a object so, that easily extract required data. 
                owner:{
                  $first:"$owner"          // this owner is now a object with required data.
                }
              }
            }
          ]
        }
      }
  ])

  return res
          .status(200)
          .json(new apiResponse(
            200,
            user[0].watchHostory,
            "watchHistory fetch successfully"
          ))
})


export {
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   changeCurrentPassword,
   getCurrentUser,
   updateAccountDetail,
   updateAvatar,
   updateCoverImage,
   getUserChannelProfile,
   getWatchHistory
   };
  