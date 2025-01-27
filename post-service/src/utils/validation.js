const Joi = require('joi');

const validateCreatePostData = (data) => {
    const schema = Joi.object({
        content: Joi.string().min(3).max(500).required(),
    })
    return schema.validate(data);
}
module.exports = { validateCreatePostData };