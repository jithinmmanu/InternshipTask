const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Group = require('../models/groupModel');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// User Management

// Create a new user
router.post('/users', authMiddleware, async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role
    });
    await newUser.save();
    res.status(201).json({ message: 'User created', user: newUser });
  } catch (err) {
    res.status(400).json({ message: 'Error creating user' });
  }
});

// Update user details
router.put('/users/:userId', authMiddleware, async (req, res) => {
  const { name, email, role } = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.userId, { name, email, role }, { new: true });
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated', user: updatedUser });
  } catch (err) {
    res.status(400).json({ message: 'Error updating user' });
  }
});

// Delete a user
router.delete('/users/:userId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Error deleting user' });
  }
});

// Get all users
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find();
    res.json({ users });
  } catch (err) {
    res.status(400).json({ message: 'Error fetching users' });
  }
});

// Group Management

// Create a new group
router.post('/groups', authMiddleware, async (req, res) => {
  const { name } = req.body;
  const newGroup = new Group({
    name,
    adminId: req.user._id
  });

  try {
    await newGroup.save();
    res.status(201).json({ message: 'Group created', group: newGroup });
  } catch (err) {
    res.status(400).json({ message: 'Error creating group' });
  }
});

// Add a member to a group
router.post('/groups/:groupId/members', authMiddleware, async (req, res) => {
  const { userId } = req.body;
  const group = await Group.findById(req.params.groupId);

  if (!group) return res.status(404).json({ message: 'Group not found' });

  // Check if current user is the admin of the group
  if (group.adminId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Only the admin can add members' });
  }

  const member = await User.findById(userId);
  if (!member) return res.status(404).json({ message: 'User not found' });

  group.members.push(member);
  await group.save();

  // Send notifications to the admin and the new member
  // In a real-world scenario, you can use a notification system like email or push notifications
  res.status(200).json({ message: 'User added to group', group });
});

// Get all groups
router.get('/groups', authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find().populate('adminId members');
    res.json({ groups });
  } catch (err) {
    res.status(400).json({ message: 'Error fetching groups' });
  }
});

module.exports = router;
