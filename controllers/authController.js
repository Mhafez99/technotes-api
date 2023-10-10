const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

// @desc Login
// @route POST /auth
// @access Public
const login = asyncHandler(async (req, res) => {
    const {username, password} = req.body;

    if (!username || !password) {
        return res.status(400).json({message: "All Fields are Required"});
    }

    const foundUser = await User.findOne({username}).exec();

    if (!foundUser || !foundUser.active) {
        return res.status(401).json({message: "Unauthorized"});
    }

    const match = await bcrypt.compare(password, foundUser.password);

    if (!match) return res.status(401).json({message: "Unauthorized"});

    const accessToken = jwt.sign(
        {
            "UserInfo": {
                "username": foundUser.username,
                "roles": foundUser.roles
            }
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: "15m"}
    );

    const refreshToken = jwt.sign(
        {
            "username": foundUser.username,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn: "7d"}
    );

    res.cookie("jwt", refreshToken, {
        httpOnly: true, // Only Accessible by web server
        secure: true, //https
        sameSite: 'none', //cross-site
        maxAge: 7 * 24 * 60 * 60 * 1000 //cookie expiration
    });

    res.json({accessToken});
});


// @desc Refresh
// @route GET /auth/refresh
// @access Public - accessToken has expired
const refresh = async (req, res) => {
    const cookies = req.cookies;

    if (!cookies?.jwt) {
        return res.status(401).json({message: "Unauthorized"});
    }

    const refreshToken = cookies.jwt;

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, asyncHandler(async (err, decoded) => {
        if (err) return res.status(403).json({message: "Forbidden"});
        const foundUser = await User.findOne({username: decoded.username});
        if (!foundUser) return res.status(401).json({message: "Unauthorized"});

        const accessToken = jwt.sign(
            {
                "UserInfo": {
                    "username": foundUser.username,
                    "roles": foundUser.roles
                }
            },
            process.env.ACCESS_TOKEN_SECRET,
            {expiresIn: "15m"}
        );

        res.json({accessToken});
    }));

};

// @desc Logout
// @route POST /auth/logout
// @access Public - clean cookie If Exists
const logout = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies.jwt) return res.sendStatus(204); // Not Content
    res.clearCookie("jwt", {
        httpOnly: true,
        sameSite: "none",
        secure: true
    });
    res.json({message: "Cookie Cleared"});
};

module.exports = {
    login,
    refresh,
    logout
}





