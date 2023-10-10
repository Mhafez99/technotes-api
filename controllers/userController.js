const User = require("../models/User");
const Note = require("../models/Note");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

// @desc Get All Users
// @route GET /users
// @access Private
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find().select(`-password`).lean();
    if (!users?.length) {
        return res.status(400).json({message: "No Users Found"});
    }
    res.json(users);
});

// @desc Create New User
// @route POST /users
// @access Private
const createNewUser = asyncHandler(async (req, res) => {
    const {username, password, roles} = req.body;
    if (!username || !password) {
        return res.status(400).json({message: "All Fields are required"});
    }
    const duplicate = await User.findOne({username}).collation({locale: "en", strength: 2}).lean().exec();

    if (duplicate) {
        return res.status(409).json({message: "Duplicate username"});
    }
    const hashedPwd = await bcrypt.hash(password, 10);

    const userObject = (!Array.isArray(roles) || !roles.length)
        ? {username, "password": hashedPwd}
        : {username, "password": hashedPwd, roles};

    const user = await User.create(userObject);

    if (user) {
        res.status(201).json({message: `New User ${username} created`});
    } else {
        res.status(400).json({message: `Invalid User data received`});
    }
});

// @desc Update a User
// @route PATCH /users
// @access Private
const updateUser = asyncHandler(async (req, res) => {
    const {id, username, roles, active, password} = req.body;
    if (!id || !username || !Array.isArray(roles) || !roles.length || typeof active !== "boolean") {
        return res.status(400).json({message: "All Fields are required"});
    }
    const user = await User.findById(id).exec();

    if (!user) {
        return res.status(400).json({message: 'User Not Found'});
    }

    const duplicate = await User.findOne({username}).collation({locale: "en", strength: 2}).lean().exec();

    // Allow Updadte to the original user
    if (duplicate && duplicate?._id.toString() !== id) {
        return res.status(409).json({message: "Duplicate username"});
    }
    user.username = username;
    user.roles = roles;
    user.active = active;

    if (password) {
        user.password = await bcrypt.hash(password, 10);
    }
    const updatedUser = await user.save();

    res.json({messsage: `${updatedUser.username} Updated`});
});

// @desc Delete a User
// @route Delete /users
// @access Private
const deleteUser = asyncHandler(async (req, res) => {
    const {id} = req.body;
    if (!id) {
        return res.status(400).json({message: "User ID required"});
    }
    const note = await Note.findOne({user: id}).lean().exec();
    if (note) {
        return res.status(400).json({message: "User has assigned notes"});
    }
    const user = await User.findById(id).exec();
    if (!user) {
        return res.status(400).json({message: "User Not Found"});
    }
    const result = await user.deleteOne();
    const reply = `Username ${result.username} With ID ${result._id} deleted`;
    res.json({message: reply});
});



module.exports = {
    getAllUsers,
    createNewUser,
    updateUser,
    deleteUser
}

