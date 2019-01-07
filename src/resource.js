const Sequelize = require('sequelize')
const { Op } = Sequelize
const {
  BaseResource,
  BaseRecord,
  ValidationError,
} = require('admin-bro')

const Property = require('./property')

const SEQUELIZE_VALIDATION_ERROR = 'SequelizeValidationError'

class Resource extends BaseResource {
  static isAdapterFor(rawResource) {
    return rawResource.prototype instanceof Sequelize.Model
  }

  constructor(SequelizeModel) {
    super(SequelizeModel)
    this.SequelizeModel = SequelizeModel
  }

  databaseName() {
    return this.SequelizeModel.sequelize.options.database
  }

  databaseType() {
    return this.SequelizeModel.sequelize.options.dialect
  }

  name() {
    return this.SequelizeModel.tableName
  }

  id() {
    return this.SequelizeModel.tableName.toLowerCase()
  }


  properties() {
    return Object.keys(this.SequelizeModel.attributes).map(key => (
      new Property(this.SequelizeModel.attributes[key])
    ))
  }

  property(path) {
    return new Property(this.SequelizeModel.attributes[path])
  }

  async count(filters) {
    return this.SequelizeModel.count(({ where: this.convertedFilters(filters) }))
  }

  getDateFilter(filter) {
    const { from, to } = filter
    return {
      ...from && { [Op.gte]: from },
      ...to && { [Op.lte]: to }
    }
  } 

  getDefaultFilter(filter) {
    return {
      [Op.iRegexp] : filter
    }
  }

  convertedFilters(filters) {
    if(!filters) return {}
    const convertedFilters = {}
    Object.keys(filters).map(key => {
      const currentFilter = filters[key]
      const isDateFilter = currentFilter.from || currentFilter.to
      convertedFilters[key] = isDateFilter ? 
        this.getDateFilter(currentFilter) : this.getDefaultFilter(currentFilter)
    })
    return convertedFilters
  }

  async find(filters = {}, { limit = 20, offset = 0, sort = {} }) {
    const { direction, sortBy } = sort
    const sequelizeObjects = await this.SequelizeModel
      .findAll({ 
        where: this.convertedFilters(filters),
        limit, 
        offset, 
        order: [[sortBy, direction.toUpperCase()]] 
      })
    return sequelizeObjects.map(sequelizeObject => new BaseRecord(sequelizeObject.toJSON(), this))
  }

  async findOne(id) {
    const sequelizeObject = await this.SequelizeModel.findByPk(id)
    return new BaseRecord(sequelizeObject.toJSON(), this)
  }

  async create(params) {
    try {
      const record = await this.SequelizeModel.create(params)
      return record.toJSON()
    } catch (error) {
      if (error.name === SEQUELIZE_VALIDATION_ERROR) {
        throw this.createValidationError(error)
      }
      throw error
    }
  }

  async update(id, params) {
    try {
      await this.SequelizeModel.update(params, {
        where: { id },
      })
      const record = await this.SequelizeModel.findByPk(id)
      return record.toJSON()
    } catch (error) {
      if (error.name === SEQUELIZE_VALIDATION_ERROR) {
        throw this.createValidationError(error)
      }
      throw error
    }
  }

  async delete(id) {
    return this.SequelizeModel.destroy({ where: { id } })
  }

  createValidationError(originalError) {
    const errors = Object.keys(originalError.errors).reduce((memo, key) => {
      const { path, message, validatorKey } = originalError.errors[key]
      memo[path] = { message, kind: validatorKey } // eslint-disable-line no-param-reassign
      return memo
    }, {})
    return new ValidationError(`${this.name()} validation failed`, errors)
  }
}

module.exports = Resource
