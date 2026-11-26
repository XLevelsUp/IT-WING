import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class User extends Model {
  async matchPassword(enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    _id: {
      type: DataTypes.STRING(64),
      unique: true,
      defaultValue: () => crypto.randomBytes(12).toString('hex'),
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('superadmin', 'district_admin', 'subadmin', 'ward_secretary', 'ward_officer', 'citizen', 'user', 'staff', 'paguthi_seyalaalar'),
      defaultValue: 'citizen',
    },
    constituency: {
      type: DataTypes.STRING(100),
      defaultValue: 'Coimbatore South',
    },
    paguthi: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    village: {
      type: DataTypes.STRING(150),
      defaultValue: '',
    },
    address: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    phone: {
      type: DataTypes.STRING(50),
      defaultValue: '',
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    assignedDistrict: {
      type: DataTypes.STRING(100),
      defaultValue: 'Coimbatore',
    },
    assignedWard: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    wardId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    avatarUrl: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (!user._id) {
          user._id = crypto.randomBytes(12).toString('hex');
        }
        if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password') && user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

attachMongooseCompat(User);

export default User;
