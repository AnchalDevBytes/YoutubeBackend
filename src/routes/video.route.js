import { Router } from "express";
import { deleteVideo, getAllVideos, getVideoById, publishVideo, togglePublishStatus, updateVideo } from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT)   //apply verifyJWT middleware for all routes

router.route("/").get(getAllVideos)
router.route("/").post(
        upload.fields([
            {
                name:"videoFile",
                maxCount:1
            },
            {
                name:"thumbnail",
                maxCount:1
            }
        ]),
        publishVideo
      );

router.route("/:videoId").get(getVideoById);
router.route("/:videoId").patch(upload.single("thumbnail", updateVideo));
router.route("/:videoId").delete(deleteVideo);
router.route("/toggle/publish/:videoId").patch(togglePublishStatus);


export default router