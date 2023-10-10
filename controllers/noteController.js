const Note = require('../models/Note');
const User = require('../models/User');


const asyncHandler = require('express-async-handler');


const getAllNotes = asyncHandler(async (req, res) => {
    const notes = await Note.find().lean();

    if (!notes?.length) {
        return res.status(400).json({message: 'No notes found'});
    }

    // See Promise.all with map() here: https://youtu.be/4lqJBBEpjRE 
    const notesWithUser = await Promise.all(notes.map(async (note) => {
        const user = await User.findById(note.user).lean().exec();
        return {...note, username: user.username};
    }));

    res.json(notesWithUser);
});


// @desc Create new note
// @route POST /notes
// @access Private
const createNewNote = asyncHandler(async (req, res) => {
    const {user, title, text} = req.body;

    // Confirm data
    if (!user || !title || !text) {
        return res.status(400).json({message: 'All fields are required'});
    }

    // Check for duplicate title
    const duplicate = await Note.findOne({title}).collation({locale: "en", strength: 2}).lean().exec();

    if (duplicate) {
        return res.status(409).json({message: 'Duplicate note title'});
    }

    // Create and store the new user 
    const note = await Note.create({user, title, text});

    if (note) { // Created 
        return res.status(201).json({message: 'New note created'});
    } else {
        return res.status(400).json({message: 'Invalid note data received'});
    }

});


const updateNote = asyncHandler(async (req, res) => {
    const {id, user, title, text, completed} = req.body;

    // Confirm data
    if (!id || !user || !title || !text || typeof completed !== 'boolean') {
        return res.status(400).json({message: 'All fields are required'});
    }

    // Confirm note exists to update
    const note = await Note.findById(id).exec();

    if (!note) {
        return res.status(400).json({message: 'Note not found'});
    }

    // Check for duplicate title
    const duplicate = await Note.findOne({title}).collation({locale: "en", strength: 2}).lean().exec();

    // Allow renaming of the original note 
    if (duplicate && duplicate?._id.toString() !== id) {
        return res.status(409).json({message: 'Duplicate note title'});
    }
    note.user = user;
    note.title = title;
    note.text = text;
    note.completed = completed;

    await note.save();

    res.json({message: `Note with userId ${user} updated`});
});

const deleteNote = asyncHandler(async (req, res) => {
    const {id} = req.body;

    // Confirm data
    if (!id) {
        return res.status(400).json({message: 'Note ID required'});
    }

    // Confirm note exists to delete 
    const note = await Note.findById(id).exec();

    if (!note) {
        return res.status(400).json({message: 'Note not found'});
    }

    const result = await note.deleteOne();

    const reply = `Note '${result.title}' with ID ${result._id} deleted`;

    res.json({message: reply});
});


module.exports = {
    getAllNotes,
    createNewNote,
    updateNote,
    deleteNote
};