import { Op } from 'sequelize';

/**
 * Mapping of Mongoose populate paths to Sequelize association names
 */
const POPULATE_MAP = {
  wardId: 'ward',
  ward: 'ward',
  constituencyId: 'constituency',
  constituency: 'constituency',
  districtId: 'district',
  district: 'district',
  userId: 'user',
  user: 'user',
  assignedOfficerId: 'assignedOfficerDetails',
  assignedOfficer: 'assignedOfficerDetails',
  assignedWardSecretaryId: 'assignedWardSecretary',
  assignedWardSecretary: 'assignedWardSecretary',
  performedBy: 'performer',
  issueId: 'issue',
  beforeImages: 'beforeImages',
  afterImages: 'afterImages',
  actions: 'actions',
  citizenId: 'citizen',
  subadminId: 'subadmin',
  messages: 'messages',
};

/**
 * Convert Mongoose query object to Sequelize where clause
 */
export const mongoQueryToSequelizeWhere = (query = {}) => {
  if (!query || typeof query !== 'object') return {};
  const where = {};

  for (const [key, val] of Object.entries(query)) {
    if (val === undefined) continue;

    if (key === '_id' || key === 'id') {
      const parsedId = Number(val);
      if (!isNaN(parsedId) && parsedId > 0) {
        where[Op.or] = [{ id: parsedId }, { _id: String(val) }];
      } else {
        where._id = String(val);
      }
      continue;
    }

    if (key === '$or') {
      if (Array.isArray(val)) {
        where[Op.or] = val.map((subQ) => mongoQueryToSequelizeWhere(subQ));
      }
      continue;
    }

    if (key === '$and') {
      if (Array.isArray(val)) {
        where[Op.and] = val.map((subQ) => mongoQueryToSequelizeWhere(subQ));
      }
      continue;
    }

    // Resolve foreign key ID objects e.g. { constituencyId: obj._id }
    let cleanVal = val;
    if (val && typeof val === 'object' && val._id !== undefined) {
      cleanVal = val.id || val._id;
    }

    if (cleanVal && typeof cleanVal === 'object' && !Array.isArray(cleanVal) && !(cleanVal instanceof Date)) {
      if (cleanVal.$in) {
        where[key] = { [Op.in]: cleanVal.$in };
      } else if (cleanVal.$nin) {
        where[key] = { [Op.notIn]: cleanVal.$nin };
      } else if (cleanVal.$regex) {
        const cleanPattern = String(cleanVal.$regex).replace(/^\^|\$$/g, '');
        where[key] = { [Op.like]: `%${cleanPattern}%` };
      } else if (cleanVal.$gte !== undefined || cleanVal.$lte !== undefined || cleanVal.$gt !== undefined || cleanVal.$lt !== undefined) {
        where[key] = {};
        if (cleanVal.$gte !== undefined) where[key][Op.gte] = cleanVal.$gte;
        if (cleanVal.$lte !== undefined) where[key][Op.lte] = cleanVal.$lte;
        if (cleanVal.$gt !== undefined) where[key][Op.gt] = cleanVal.$gt;
        if (cleanVal.$lt !== undefined) where[key][Op.lt] = cleanVal.$lt;
      } else if (cleanVal.$ne !== undefined) {
        where[key] = { [Op.ne]: cleanVal.$ne };
      } else {
        where[key] = cleanVal;
      }
    } else {
      where[key] = cleanVal;
    }
  }

  return where;
};

/**
 * Helper to build Sequelize order array from sort param
 */
export const buildOrder = (sortParam) => {
  if (!sortParam) return undefined;
  if (Array.isArray(sortParam)) return sortParam;

  if (typeof sortParam === 'string') {
    const fields = sortParam.trim().split(/\s+/);
    return fields.map((field) => {
      if (field.startsWith('-')) {
        return [field.substring(1), 'DESC'];
      }
      return [field, 'ASC'];
    });
  }

  if (typeof sortParam === 'object') {
    return Object.entries(sortParam).map(([field, dir]) => {
      const isDesc = dir === -1 || dir === 'desc' || dir === 'DESC';
      return [field, isDesc ? 'DESC' : 'ASC'];
    });
  }

  return undefined;
};

/**
 * Chainable query builder for Mongoose compatibility over Sequelize
 */
class MongooseCompatQuery {
  constructor(model, baseWhere = {}) {
    this.model = model;
    this.where = mongoQueryToSequelizeWhere(baseWhere);
    this.includes = [];
    this.orderClause = undefined;
    this.limitCount = undefined;
    this.offsetCount = undefined;
    this.attributesList = undefined;
    this.isSingle = false;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  populate(path, select) {
    if (!path) return this;
    const assocName = POPULATE_MAP[path] || path;
    const assoc = this.model.associations ? this.model.associations[assocName] : null;

    if (assoc) {
      const includeItem = { association: assocName };
      if (select && typeof select === 'string') {
        const parts = select.trim().split(/\s+/).filter(Boolean);
        includeItem.attributes = ['id', '_id', ...parts.filter((p) => !p.startsWith('-'))];
      }
      this.includes.push(includeItem);
    }
    return this;
  }

  sort(sortParam) {
    this.orderClause = buildOrder(sortParam);
    return this;
  }

  skip(count) {
    if (typeof count === 'number' && count >= 0) {
      this.offsetCount = count;
    }
    return this;
  }

  limit(count) {
    if (typeof count === 'number' && count > 0) {
      this.limitCount = count;
    }
    return this;
  }

  select(fields) {
    if (!fields) return this;
    if (typeof fields === 'string') {
      const parts = fields.trim().split(/\s+/).filter(Boolean);
      const exclude = parts.filter((p) => p.startsWith('-')).map((p) => p.substring(1));
      const include = parts.filter((p) => !p.startsWith('-'));

      if (exclude.length > 0) {
        this.attributesList = { exclude };
      } else if (include.length > 0) {
        this.attributesList = ['id', '_id', ...include];
      }
    } else if (Array.isArray(fields)) {
      this.attributesList = fields;
    }
    return this;
  }

  async exec() {
    const opts = {
      where: this.where,
    };
    if (this.includes.length > 0) opts.include = this.includes;
    if (this.orderClause) opts.order = this.orderClause;
    if (this.limitCount !== undefined) opts.limit = this.limitCount;
    if (this.offsetCount !== undefined) opts.offset = this.offsetCount;
    if (this.attributesList) opts.attributes = this.attributesList;

    if (this.isSingle) {
      return await this.model.findOne(opts);
    }
    return await this.model.findAll(opts);
  }

  // Promise interface
  then(onFulfilled, onRejected) {
    return this.exec().then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this.exec().catch(onRejected);
  }
}

/**
 * Attach compatibility methods to a Sequelize model
 */
export const attachMongooseCompat = (Model) => {
  // Ensure instances have toObject()
  if (!Model.prototype.toObject) {
    Model.prototype.toObject = function () {
      return this.toJSON ? this.toJSON() : this;
    };
  }

  // Model.find(query) -> chainable
  Model.find = function (query = {}) {
    return new MongooseCompatQuery(this, query);
  };

  // Model.findById(id) -> chainable or direct promise
  Model.findById = function (id) {
    const query = new MongooseCompatQuery(this);
    if (!id) {
      query.where = { id: -999999 };
      return query.single();
    }
    const num = Number(id);
    if (!isNaN(num) && num > 0) {
      query.where = { [Op.or]: [{ id: num }, { _id: String(id) }] };
    } else {
      query.where = { _id: String(id) };
    }
    return query.single();
  };

  // Model.findByIdAndUpdate(id, data, options)
  Model.findByIdAndUpdate = async function (id, updateData, options = {}) {
    const instance = await this.findById(id);
    if (!instance) return null;
    await instance.update(updateData);
    return instance;
  };

  // Model.findByIdAndDelete(id)
  Model.findByIdAndDelete = async function (id) {
    const instance = await this.findById(id);
    if (!instance) return null;
    await instance.destroy();
    return instance;
  };

  // Model.findOneAndDelete(query)
  Model.findOneAndDelete = async function (query = {}) {
    const where = mongoQueryToSequelizeWhere(query);
    const instance = await this.findOne({ where });
    if (!instance) return null;
    await instance.destroy();
    return instance;
  };

  // Model.findOneAndUpdate(query, updateData, options)
  Model.findOneAndUpdate = async function (query = {}, updateData, options = {}) {
    const where = mongoQueryToSequelizeWhere(query);
    const instance = await this.findOne({ where });
    if (!instance) return null;
    await instance.update(updateData);
    return instance;
  };

  // Model.updateMany(query, updateData)
  Model.updateMany = async function (query = {}, updateData = {}) {
    const where = mongoQueryToSequelizeWhere(query);
    return await this.update(updateData, { where });
  };

  // Model.countDocuments(query)
  Model.countDocuments = async function (query = {}) {
    const where = mongoQueryToSequelizeWhere(query);
    return await this.count({ where });
  };

  return Model;
};
