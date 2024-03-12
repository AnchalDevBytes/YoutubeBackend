
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise
        .resolve(fn(req, res, next))
        .catch((err) => next(err))
    }
}


export {asyncHandler}


/*
//It is a higher order function which take a fn inside a fumnction.
//here we take a function (fn) and further pass that function in another function and make it async so that we can talk to database and extract req, res, and next from the funcion which is pass in parameter.
const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next)
    } catch (error) { //here in error part if user give error send that error else anathor error which are suitable and also a json response is send where a flag is send true or false and error message.
        res.status(error.code || 500).json({
            success:false,
            message:error.message
        })
    }
}

export {asyncHandler}


*/
