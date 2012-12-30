/**
 * @fileoverview Description of this file.
 * @author sharvil.nanavati@gmail.com (Sharvil Nanavati)
 */

goog.provide('dotprod.sprites.PlayerSprite');

goog.require('dotprod.entities.Effect');
goog.require('dotprod.math.Vector');

/**
 * @constructor
 */
dotprod.sprites.PlayerSprite = goog.abstractMethod;

/**
 * @param {number} angle
 * @param {!dotprod.math.Vector} position
 * @param {!dotprod.math.Vector} velocity
 */
dotprod.sprites.PlayerSprite.prototype.respawn = function(angle, position, velocity) {
  goog.base(this, 'respawn', angle, position, velocity);

  var animation = this.resourceManager_.getVideoEnsemble('warp').getAnimation(0);
  this.effectIndex_.addEffect(new dotprod.entities.Effect(animation, this.position_, new dotprod.math.Vector(0, 0)));
};

dotprod.sprites.PlayerSprite.prototype.onDeath = function() {
  goog.base(this, 'onDeath');

  var ensemble = this.resourceManager_.getVideoEnsemble('explode1');
  this.effectIndex_.addEffect(new dotprod.entities.Effect(ensemble.getAnimation(0), this.position_, this.velocity_));

  ensemble = this.resourceManager_.getVideoEnsemble('ship' + this.ship_ + '_junk');
  for (var i = 0; i < ensemble.getNumAnimations(); ++i) {
    var animation = ensemble.getAnimation(i);
    var deltaVelocity = dotprod.math.Vector.fromPolar(Math.random() * 2, Math.random() * 2 * Math.PI);
    var piece = new dotprod.entities.Effect(animation, this.position_, this.velocity_.add(deltaVelocity));
    this.effectIndex_.addEffect(piece);
  }
};

/**
 * @param {!dotprod.Camera} camera
 */
dotprod.sprites.PlayerSprite.prototype.render = function(camera) {
  if (!this.isAlive()) {
    return;
  }

  var shipImage = this.resourceManager_.getImage('ship' + this.ship_);
  var awayImage = this.resourceManager_.getImage('presenceAway');
  var typingImage = this.resourceManager_.getImage('presenceTyping');

  var localPlayer = this.game_.getPlayerIndex().getLocalPlayer();
  var tileNum = Math.floor(this.angleInRadians_ / (2 * Math.PI) * shipImage.getNumTiles());
  var dimensions = camera.getDimensions();
  var context = camera.getContext();

  var x = Math.floor(this.position_.getX() - dimensions.left - shipImage.getTileWidth() / 2);
  var y = Math.floor(this.position_.getY() - dimensions.top - shipImage.getTileHeight() / 2);

  shipImage.render(context, x, y, tileNum);

  var presenceImage = null;
  if (this.hasPresence(dotprod.entities.Player.Presence.AWAY)) {
    presenceImage = awayImage;
  } else if (this.hasPresence(dotprod.entities.Player.Presence.TYPING)) {
    presenceImage = typingImage;
  }

  if (presenceImage) {
    var speechX = x + shipImage.getTileWidth() - Math.floor(presenceImage.getTileWidth() / 2);
    var speechY = y - Math.floor(presenceImage.getTileHeight() / 2);
    presenceImage.render(context, speechX, speechY);
  }

  context.save();
    context.font = dotprod.FontFoundry.playerFont();
    context.fillStyle = this.isFriend(localPlayer) ? dotprod.Palette.friendColor() : dotprod.Palette.foeColor();
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillText(this.name_ + '(' + this.bounty_ + ')', x + shipImage.getTileWidth() / 2, y + shipImage.getTileHeight());
  context.restore();
};
