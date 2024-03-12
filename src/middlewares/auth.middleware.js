import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken'

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        //here I want to injected user in req so first access token from cookie
        //if token then check token are correct or not so decode token
        //when token decoded find the user with id
        //if user set it in req

        const token = req.cookie?.accessToken || req.header("Authorization")?.replace("Bearer ", "")          //access accessToken from cookie if not access Authorixation from header and replace "Bearer " with empty string
        if(!token) {
            throw new apiError(401, "Unauthorized request")
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = User.findById(decodedToken._id).select("-password -refreshToken")

        if(!user) {
            //TODO: disccussion with frontend
            throw new apiError(401, "Invalid token")
        }

        req.user = user;
        next();

    } catch (error) {
        throw new apiError(401, error?.message || "Invalid access token")
    }
})