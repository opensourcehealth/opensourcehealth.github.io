//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gCreatureVariableSet = new Set(['color', 'filename', 'location', 'scaleIndex'])
const gRegionVariableSet = new Set(['entry', 'terrain'])

function getEntryLocation(childrenMaps, entryCenter, terrain) {
	var childrenMap = childrenMaps[0]
	if (!childrenMap.has(entryCenter[0].toString() + ',' + entryCenter[1].toString())) {
		return entryCenter
	}
	for (var shellIndex = 1; shellIndex < 9; shellIndex++) {
		for (var signedShellIndex = - shellIndex; signedShellIndex <= shellIndex; signedShellIndex += shellIndex + shellIndex) {
			for (var x = 1 - shellIndex; x < shellIndex; x++) {
				var entryLocation = get2DAddition(entryCenter, [x, signedShellIndex])
				if (!getIsOccupied(childrenMaps, entryLocation, terrain)) {
					return entryLocation
				}
			}
			for (var y = - shellIndex; y <= shellIndex; y++) {
				var entryLocation = get2DAddition(entryCenter, [signedShellIndex, y])
				if (!getIsOccupied(childrenMaps, entryLocation, terrain)) {
					return entryLocation
				}
			}
		}
	}
	return entryCenter
}

function getIsOccupied(childrenMaps, location, terrain) {
	if (terrain.getTerrainParameters(location, 0).length > 3) {
		return true
	}
	for (var scaleIndex = 0; scaleIndex < childrenMaps.length; scaleIndex++) {
		var childrenMap = childrenMaps[scaleIndex]
		var locationAtScale = terrain.getLocationAtScale(location, scaleIndex)
		var xyKey = locationAtScale[0].toString() + ',' + locationAtScale[1].toString()
		if (childrenMap.has(xyKey)) {
			var children = childrenMap.get(xyKey)
			for (var child of children) {
				if (child.location[0] == location[0] && child.location[1] == location[1]) {
					return true
				}
			}
		}
	}
	return false
}

function setAttributeMap(exceptSet, fromMap, toMap) {
	for (var key of fromMap) {
		if (!exceptSet.has(key)) {
			toMap.set(key, fromMap.get(key))
		}
	}
}

function Creature() {
	this.archetype = null
	this.attributeMap = new Map()
	this.children = []
	this.color = '#696006'
	this.filename = 'delfador.png'
	this.location = [0.0, 0.0]
	this.parent = null
	this.scaleIndex = 0
	this.add = function(child) {
		this.children.push(child)
		child.location = null
		child.parent = this
		return true
	}
	this.getChildren = function() {
		return this.children
	}
}

function Region(terrain) {
	this.attributeMap = new Map()
	this.childrenMaps = []
	this.entry = [0, 0]
	this.location = [0, 0]
	this.parent = null
	this.scaleIndex = 0
	this.terrainMap = new Map()
	this.terrain = terrain
	this.add = function(child) {
		for (var mapIndex = this.childrenMaps.length; mapIndex < child.scaleIndex + 1; mapIndex++) {
			this.childrenMaps.push(new Map())
		}
		add2D(child.location, this.entry)
		child.location = getEntryLocation(this.childrenMaps, child.location, this.terrain)
		var childrenMap = this.childrenMaps[child.scaleIndex]
		var locationAtScale = this.terrain.getLocationAtScale(child.location, child.scaleIndex)
		var addKey = locationAtScale[0].toString() + ',' + locationAtScale[1].toString()
		var children = null
		if (childrenMap.has(addKey)) {
			children = childrenMap.get(addKey)
		}
		else {
			children = []
			childrenMap.set(addKey, children)
		}
		children.push(child)
		child.parent = this
		return true
	}
	this.getChildren = function() {
		var allChildren = []
		for (var childrenMap of this.childrenMaps) {
			for (var children of this.childrenMap.values()) {
				pushArray(allChildren, children)
			}
		}
		return allChildren
	}
}

var gCreature = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'creature',
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var creature = new Creature()
		if (attributeMap.has('race')) {
			if (attributeMap.get('race') == 'red dragon') {
				creature.color = '#ffa500'
				creature.filename = 'red_dragon_welsh.png'
			}
		}
	//	if (!attributeMap.has('archetype')) {
	//		attributeMap.set('archetype', 'sage')
	//	}
		var storageMap = registry.storageMap
		var selectedRegion = storageMap.get('selectedRegion')
	//	var archetype = attributeMap.get('archetype')
		creature.color = getValueByKeyDefault(creature.color, 'color', registry, statement, this.name)
		creature.filename = getValueByKeyDefault(creature.filename, 'filename', registry, statement, this.name)
		creature.location = getFloatsByDefault(creature.location, 'location', registry, statement, this.name)
		creature.scaleIndex = getIntByDefault(creature.scaleIndex, 'scaleIndex', registry, statement, this.name)
		setAttributeMap(gCreatureVariableSet, attributeMap, creature.attributeMap)
		if (selectedRegion != null) {
			selectedRegion.add(creature)
		}
	}
}

var gLaunch = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'launch',
	processStatement:function(registry, statement) {
		var workStatement = getWorkStatement(registry, statement)
		if (workStatement == null) {
			return
		}
		var workAttributeMap = workStatement.attributeMap
		var exhaustVelocity = getFloatByDefault(1000.0, 'exhaustVelocity', registry, workStatement, this.name)
		var numberOfStages = getIntByDefault(1, 'stages', registry, workStatement, this.name)
		var payloadRatio = getFloatByDefault(1.0, 'payloadRatio', registry, workStatement, this.name)
		var propellantRatio = getFloatByDefault(10.0, 'propellantRatio', registry, workStatement, this.name)
		var dryMass = 1.0 + payloadRatio
		var wetMass = dryMass + propellantRatio
		var massRatio = wetMass / dryMass
		var wetPayloadRatio = wetMass / payloadRatio
		var stageSpeed = exhaustVelocity * Math.log(massRatio)
		var finalSpeed = numberOfStages * stageSpeed
		var finalWetPayloadRatio = Math.pow(wetPayloadRatio, numberOfStages)
		console.log(finalSpeed)
		console.log(finalWetPayloadRatio)
		console.log(massRatio)
		console.log(stageSpeed)
		console.log(wetMass)
	}
}

var gRegion = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'region',
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		if (!attributeMap.has('terrain')) {
			attributeMap.set('terrain', 'oceanfront')
		}
		var storageMap = registry.storageMap
		var selectedRegion = storageMap.get('selectedRegion')
		var terrainString = attributeMap.get('terrain')
		var terrain = new Terrain(terrainString)
		var region = new Region(terrain)
		region.entry = getFloatsByDefault([6204,0], 'entry', registry, statement, this.name)
		if (selectedRegion != null) {
			selectedRegion.add(region)
		}
		storageMap.set('selectedRegion', region)
		terrainViewer.region = region
	}
}

var gTerrainViewer = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'terrainViewer',
	processStatement:function(registry, statement) {
	//	var maximumWidth = getFloatByDefault(740.0, 'maximumWidth', registry, statement, this.name)
		var maximumWidth = getFloatByDefault(390.0, 'maximumWidth', registry, statement, this.name)
		registry.storageMap.set('terrainViewer.maximumHeight', maximumWidth)
		registry.storageMap.set('terrainViewer.maximumWidth', maximumWidth)
	}
}

var gTerrainProcessors = [gCreature, gLaunch, gRegion, gTerrainViewer]
