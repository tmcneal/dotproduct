goog.provide('model.Gun');

goog.require('goog.asserts');
goog.require('math.Range');
goog.require('model.projectile.BulletGroup');
goog.require('model.Weapon.Type');
goog.require('ToggleState');

/**
 * @constructor
 * @implements model.Weapon
 * @param {!Game} game
 * @param {!Object} gunSettings
 * @param {!model.player.Player} owner
 */
model.Gun = function(game, gunSettings, owner) {
  /**
   * @type {!Game}
   * @private
   */
  this.game_ = game;

  /**
   * @type {!Object}
   * @private
   */
  this.gunSettings_ = gunSettings;

  /**
   * @type {!model.player.Player}
   * @private
   */
  this.owner_ = owner;

  /**
   * @type {!math.Range}
   * @private
   */
  this.level_ = new math.Range(Math.min(0, this.gunSettings_['maxLevel']), this.gunSettings_['maxLevel'], 1);
  this.level_.setValue(this.gunSettings_['initialLevel']);

  /**
   * @type {boolean}
   * @private
   */
  this.bouncingBullets_ = false;

  /**
   * @type {ToggleState}
   * @private
   */
  this.multifireState_ = ToggleState.UNAVAILABLE;
};

/**
 * @override
 */
model.Gun.prototype.getType = function() {
  return model.Weapon.Type.GUN;
};

/**
 * @return {number}
 */
model.Gun.prototype.getLevel = function() {
  return this.level_.getValue();
};

model.Gun.prototype.upgrade = function() {
  this.level_.increment();
};

/**
 * @param {boolean} bounces
 */
model.Gun.prototype.setBounces = function(bounces) {
  this.bouncingBullets_ = bounces;
};

/**
 * Grants the ability to shoot multifire bullets from this gun. Multifire can
 * only be granted if the 'multifire' section exists in the gun settings.
 */
model.Gun.prototype.grantMultifire = function() {
  // If multifire is a newly granted capability, enable it by default.
  if (this.multifireState_ == ToggleState.UNAVAILABLE && this.gunSettings_['multifire']) {
    this.multifireState_ = ToggleState.ENABLED;
  }
};

/**
 * @return {ToggleState}
 */
model.Gun.prototype.getMultifireState = function() {
  return this.multifireState_;
};

/**
 * Toggles multifire bullets on the gun. This function won't enable multifire if
 * it's not available.
 *
 * @param {boolean} enabled
 */
model.Gun.prototype.toggleMultifire = function() {
  if (this.multifireState_ == ToggleState.ENABLED) {
    this.multifireState_ = ToggleState.DISABLED;
  } else if (this.multifireState_ == ToggleState.DISABLED) {
    this.multifireState_ = ToggleState.ENABLED;
  }
};

/**
 * @param {number} angle
 * @param {!math.Vector} position
 * @param {!math.Vector} velocity
 * @param {function(number, number): boolean} commitFireFn
 * @return {Object}
 */
model.Gun.prototype.fire = function(angle, position, velocity, commitFireFn) {
  var fireEnergy = this.getFireEnergy_();
  var fireDelay = this.getFireDelay_();
  var level = this.level_.getValue();

  if (level < 0 || !commitFireFn(fireEnergy, fireDelay)) {
    return null;
  }

  var factory = this.game_.getModelObjectFactory();
  var lifetime = this.getLifetime_();
  var damage = this.getDamage_();
  var bounceCount = this.getBounceCount_();
  var bulletSpeed = this.getBulletSpeed_();
  var multifireAngle = (this.multifireState_ == ToggleState.ENABLED) ? this.gunSettings_['multifire']['angle'] : 0;

  var bullets = [];
  if (this.gunSettings_['doubleBarrel']) {
    var bulletVelocity = velocity.add(math.Vector.fromPolar(bulletSpeed, angle));
    var leftPosition = position.add(math.Vector.fromPolar(10, angle - Math.PI / 2));
    var rightPosition = position.add(math.Vector.fromPolar(10, angle + Math.PI / 2));

    bullets.push(factory.newBullet(this.game_, this.owner_, level, leftPosition, bulletVelocity, lifetime, damage, bounceCount));
    bullets.push(factory.newBullet(this.game_, this.owner_, level, rightPosition, bulletVelocity, lifetime, damage, bounceCount));
  } else {
    var bulletVelocity = velocity.add(math.Vector.fromPolar(bulletSpeed, angle));
    bullets.push(factory.newBullet(this.game_, this.owner_, level, position, bulletVelocity, lifetime, damage, bounceCount));
  }

  if (this.multifireState_ == ToggleState.ENABLED) {
    var leftVelocity = velocity.add(math.Vector.fromPolar(bulletSpeed, angle - multifireAngle));
    var rightVelocity = velocity.add(math.Vector.fromPolar(bulletSpeed, angle + multifireAngle));
    bullets.push(factory.newBullet(this.game_, this.owner_, level, position, leftVelocity, lifetime, damage, bounceCount));
    bullets.push(factory.newBullet(this.game_, this.owner_, level, position, rightVelocity, lifetime, damage, bounceCount));
  }

  for (var i = 0; i < bullets.length; ++i) {
    this.owner_.addProjectile(bullets[i]);
  }

  new model.projectile.BulletGroup(bullets);
  this.game_.getResourceManager().playSound('gun' + level);

  return {
    'type': this.getType(),
    'angle': angle,
    'level': level,
    'bounceCount': bounceCount,
    'multifire': this.multifireState_ == ToggleState.ENABLED
  }
};

/**
 * @override
 */
model.Gun.prototype.onFired = function(timeDiff, position, velocity, weaponData) {
  goog.asserts.assert(weaponData['type'] == this.getType(), 'Cannot fire gun with incorrect weapon type: ' + weaponData['type']);

  var factory = this.game_.getModelObjectFactory();
  var level = weaponData['level'];
  var angle = weaponData['angle'];
  var bounceCount = weaponData['bounceCount'];
  var isMultifire = weaponData['multifire'];

  // Make sure the level is correct so the following getters use the right value for their calculations.
  this.level_.setValue(level);

  var factory = this.game_.getModelObjectFactory();
  var lifetime = this.getLifetime_();
  var damage = this.getDamage_();
  var bulletSpeed = this.getBulletSpeed_();
  var multifireAngle = isMultifire ? this.gunSettings_['multifire']['angle'] : 0;

  var bullets = [];
  if (this.gunSettings_['doubleBarrel']) {
    var bulletVelocity = velocity.add(math.Vector.fromPolar(bulletSpeed, angle));
    var leftPosition = position.add(math.Vector.fromPolar(10, angle - Math.PI / 2));
    var rightPosition = position.add(math.Vector.fromPolar(10, angle + Math.PI / 2));

    bullets.push(factory.newBullet(this.game_, this.owner_, level, leftPosition, bulletVelocity, lifetime, damage, bounceCount));
    bullets.push(factory.newBullet(this.game_, this.owner_, level, rightPosition, bulletVelocity, lifetime, damage, bounceCount));
  } else {
    var bulletVelocity = velocity.add(math.Vector.fromPolar(bulletSpeed, angle));
    bullets.push(factory.newBullet(this.game_, this.owner_, level, position, bulletVelocity, lifetime, damage, bounceCount));
  }

  if (isMultifire) {
    var leftVelocity = velocity.add(math.Vector.fromPolar(bulletSpeed, angle - multifireAngle));
    var rightVelocity = velocity.add(math.Vector.fromPolar(bulletSpeed, angle + multifireAngle));
    bullets.push(factory.newBullet(this.game_, this.owner_, level, position, leftVelocity, lifetime, damage, bounceCount));
    bullets.push(factory.newBullet(this.game_, this.owner_, level, position, rightVelocity, lifetime, damage, bounceCount));
  }

  for (var i = 0; i < bullets.length; ++i) {
    this.owner_.addProjectile(bullets[i]);
  }

  new model.projectile.BulletGroup(bullets);

  for (var i = 0; i < timeDiff; ++i) {
    for (var j = 0; j < bullets.length; ++j) {
      bullets[j].advanceTime();
    }
  }
};

/**
 * @return {number}
 * @private
 */
model.Gun.prototype.getFireDelay_ = function() {
  if (this.multifireState_ == ToggleState.ENABLED) {
    return this.gunSettings_['multifire']['fireDelay'];
  }
  return this.gunSettings_['fireDelay'];
};

/**
 * @return {number}
 * @private
 */
model.Gun.prototype.getFireEnergy_ = function() {
  var baseEnery = this.multifireState_ == ToggleState.ENABLED
      ? this.gunSettings_['multifire']['fireEnergy']
      : this.gunSettings_['fireEnergy'];
  return baseEnery * (this.level_.getValue() + 1);
};

/**
 * @return {number}
 * @private
 */
model.Gun.prototype.getBulletSpeed_ = function() {
  return this.gunSettings_['speed'];
};

/**
 * @return {number}
 * @private
 */
model.Gun.prototype.getLifetime_ = function() {
  return this.gunSettings_['lifetime'];
};

/**
 * @return {number}
 * @private
 */
model.Gun.prototype.getDamage_ = function() {
  return this.gunSettings_['damage'] + this.level_.getValue() * this.gunSettings_['damageUpgrade'];
};

/**
 * @return {number}
 * @private
 */
model.Gun.prototype.getBounceCount_ = function() {
  return this.gunSettings_['bounces'] && this.bouncingBullets_ ? -1 : 0;
};
