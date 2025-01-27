const Joi = require('joi');

const validateRegisteration = (data) => {
    const schema = Joi.object({
        userName: Joi.string().min(3).max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required()
    })
    return schema.validate(data);
}
const validateLogin = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required()
    }).unknown(false);
    return schema.validate(data);
}
module.exports = { validateRegisteration, validateLogin };