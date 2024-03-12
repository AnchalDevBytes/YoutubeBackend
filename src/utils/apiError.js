class apiError extends Error {
    //here to customized my error handling I made a pattern through which error shown. first make our own error class which exteneds Error class , made constructor where error must give statusCode, messages , error may be it will multiple and stack i.e error stack. if they are not given default values are worked. To overrides the value we used super() keyword and message are definetly verriddes so passses that  and other things we can overrides.
    constructor(
        statusCode,
        messages= "Something went wrong",
        errors = [],
        stack= ""
    ) {
        super(messages)
        this.statusCode = statusCode
        this.error = errors
        this.data = null
        this.success = false

        if(stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}


export {apiError}