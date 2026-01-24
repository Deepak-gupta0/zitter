import { Router } from "express"

const router = Router()
// -----------------Public Route--------------------//

router.get("/trending", getTrendingHashtag)
router.get("/search", searchHashTags) //give a query for data
router.get("/:tag/tweets", getTweetsByHashtags) //needs limit and cursor as a query

export default router;