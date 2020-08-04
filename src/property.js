const { BaseProperty } = require('admin-bro')

/** @typedef {import('admin-bro').PropertyType} PropertyType */

const TYPES_MAPPING = [
  ['STRING', 'string'],
  ['TEXT', 'string'],
  ['INTEGER', 'number'],
  ['BIGINT', 'number'],
  ['FLOAT', 'float'],
  ['REAL', 'float'],
  ['DOUBLE', 'float'],
  ['DECIMAL', 'float'],
  ['DATE', 'datetime'],
  ['DATEONLY', 'date'],
  ['ENUM', 'string'],
  ['ARRAY', 'array'],
  ['JSON', 'object'],
  ['JSONB', 'object'],
  ['BLOB', 'string'],
  ['UUID', 'string'],
  ['CIDR', 'string'],
  ['INET', 'string'],
  ['MACADDR', 'string'],
  ['RANGE', 'string'],
  ['GEOMETRY', 'string'],
  ['BOOLEAN', 'boolean'],
]

class Property extends BaseProperty {
  constructor(sequelizePath) {
    super({ path: sequelizePath.fieldName })
    this.sequelizePath = sequelizePath
  }

  name() {
    return this.sequelizePath.fieldName
  }

  isEditable() {
    return !this.sequelizePath._autoGenerated && !this.sequelizePath.autoIncrement
  }

  isVisible() {
    // fields containing password are hidden by default
    return !this.name().match('password')
  }

  isId() {
    return this.sequelizePath.primaryKey
  }

  reference() {
    return !this.isArray() && this.sequelizePath.references && this.sequelizePath.references.model
  }

  availableValues() {
    return this.sequelizePath.values && this.sequelizePath.values.length
      ? this.sequelizePath.values
      : null
  }

  isArray() {
    return this.sequelizePath.type.constructor.name === 'ARRAY'
  }

  /**
   * @returns {PropertyType}
   */
  type() {
    let sequelizeType = this.sequelizePath.type

    if (this.isArray()) {
      sequelizeType = sequelizeType.type
    }

    const key = TYPES_MAPPING.find(element => (
      sequelizeType.constructor.name === element[0]
    ))

    if (this.reference()) {
      return 'reference'
    }

    const type = key && key[1]
    return type || 'string'
  }

  isSortable() {
    return this.type() !== 'mixed' && !this.isArray()
  }

  isRequired() {
    return !(typeof this.sequelizePath.allowNull === 'undefined'
      || this.sequelizePath.allowNull === true)
  }
}

module.exports = Property
