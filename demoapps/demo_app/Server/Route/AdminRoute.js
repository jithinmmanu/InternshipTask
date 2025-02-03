import { Router, json } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middlelayer/auth.js';

const AdminRoute = Router();
AdminRoute.use(json());
mongoose.connect('mongodb://localhost:27017/task');

const UserSchema = new mongoose.Schema({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);
const GroupSchema = new mongoose.Schema({
  groupName: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  admin: { type: String, required: true }, 
  members: [{ type: String, ref: 'User' }]  
});

const Group = mongoose.model('Group', GroupSchema);


const NotificationSchema = new mongoose.Schema({
  recipient: { type: String, ref: 'User', required: true }, 
  sender: { type: String, ref: 'User', required: true }, 
  date: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', NotificationSchema);


AdminRoute.post('/sign', async (req, res) => {
  try {
    const { firstname, lastname, username, password, role } = req.body;
    const newpassword = await bcrypt.hash(password, 10);
    const Userexist = await User.findOne({ username });
    
    if (!Userexist) {
      const newUser = new User({ firstname, lastname, username, password: newpassword, role });
      await newUser.save();
      res.status(201).json({ message: 'User created successfully' });
    } else {
      res.status(400).json({ message: 'User already exists' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

AdminRoute.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const userfound = await User.findOne({ username });
    
    if (userfound) {
      const valid = await bcrypt.compare(password, userfound.password);
      
      if (valid) {
        const token = jwt.sign({ username: userfound.username, role: userfound.role }, 'hello', { expiresIn: '1h' });
        res.cookie('authtoken', token, { httpOnly: true });
        res.status(200).json({ message: 'Login successful', token });
      } else {
        res.status(400).json({ message: 'Username and password do not match' });
      }
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

AdminRoute.patch('/update', authenticate, async (req, res) => {
  try {
    const { firstname, lastname, username, password, role } = req.body;
    const userexist = await User.findOne({ username });
    
    if (userexist) {
      userexist.firstname = firstname;
      userexist.lastname = lastname;
      userexist.role = role;
      
      if (password) {
        userexist.password = await bcrypt.hash(password, 10);
      }
      
      await userexist.save();
      res.json({ message: 'User updated successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

AdminRoute.delete('/delete/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    const deluser = await User.findOneAndDelete({ username });
    
    if (deluser) {
      res.status(200).json({ message: 'User deleted successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
AdminRoute.post('/createGroup', authenticate, async (req, res) => {
  try {
    const { groupName, description } = req.body;
    const admin = req.username;

    const existingGroup = await Group.findOne({ groupName });
    if (existingGroup) {
      return res.status(400).json({ message: 'Group already exists' });
    } else {
      const newGroup = new Group({ groupName, description, admin, members: [admin] });
      await newGroup.save();
      return res.status(201).json({ message: 'Group created successfully', group: newGroup });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

AdminRoute.post('/addMember', authenticate, async (req, res) => {
  try {
    const { groupName, memberUsername } = req.body;
    const admin = req.username;

    const group = await Group.findOne({ groupName });
    if (!group) {
      return res.status(404).json({ message: `Group with name '${groupName}' not found` });
    } else {
      if (group.admin !== admin) {
        return res.status(403).json({ message: 'You are not authorized to add members to this group' });
      } else {
        const member = await User.findOne({ username: memberUsername });
        if (!member) {
          return res.status(404).json({ message: `User '${memberUsername}' not found` });
        } else {
          if (group.members.includes(member.username)) {
            return res.status(400).json({ message: 'User is already a member of the group' });
          } else {
            group.members.push(member.username);
            await group.save();

            const notificationToMember = new Notification({
              recipient: member.username,
              sender: admin,
              message: `You have been added to the group "${group.groupName}" by the admin ${group.admin}.`,
            });

            const notificationToAdmin = new Notification({
              recipient: admin,
              sender: admin,
              message: `You have successfully added ${member.username} to the group "${group.groupName}".`,
            });

            await notificationToMember.save();
            await notificationToAdmin.save();

            return res.status(200).json({ message: 'Member added successfully and notifications sent' });
          }
        }
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});







export { AdminRoute };
