//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gIDTransformSet = new Set(['id', 'transform'])

var gCircle = {
	processStatement: function(registry, statement) {
		var cx = getFloatByDefault('cx', registry, statement, this.tag, 0.0)
		var cy = getFloatByDefault('cy', registry, statement, this.tag, 0.0)
		var r = getFloatByDefault('r', registry, statement, this.tag, 1.0)
		statement.attributeMap.set('r', r.toString())
	},
	tag: 'circle'
}

var gDowel = {
	defaultSlope: 0.01,
	getDowelMesh: function(dowelPolygon, matrix3D, registry, statement) {
		var doubleTipBevel = this.tipBevel * 2.0
		var doubleTipSlope = this.slope * doubleTipBevel
		var slopeBottom = this.slope * this.bottomDowelHeight
		var layers = []
		if (this.bottomDowelHeight != 0.0) {
			var z = -this.bottomDowelHeight - this.bottomBaseHeight
			layers.push({matrix3D:z, polygons:[getWidenedPolygon(dowelPolygon, -slopeBottom - this.tipBevel)]})
			if (this.tipBevel != 0.0) {
				var widening = doubleTipSlope - slopeBottom
				layers.push({matrix3D:z + doubleTipBevel, polygons:[getWidenedPolygon(dowelPolygon, widening)], vertical:false})
			}
		}

		if (this.bottomBaseHeight != 0.0) {
			layers.push({matrix3D:-this.bottomBaseHeight, polygons:[dowelPolygon], vertical:false})
		}

		var slopeTop = this.slope * this.topDowelHeight
		if (this.topBaseHeight != 0.0) {
			if (layers.length == 0) {
				layers.push({polygons:[dowelPolygon]})
			}
			layers.push({matrix3D:this.topBaseHeight, polygons:[dowelPolygon], vertical:false})
		}

		if (this.topDowelHeight != 0.0) {
			if (layers.length == 0) {
				layers.push({polygons:[dowelPolygon]})
			}
			var z = this.topBaseHeight + this.topDowelHeight
			if (this.tipBevel != 0.0) {
				var widening = doubleTipSlope - slopeTop
				layers.push({matrix3D:z - doubleTipBevel, polygons:[getWidenedPolygon(dowelPolygon, widening)], vertical:false})
			}
			layers.push({matrix3D:z, polygons:[getWidenedPolygon(dowelPolygon, -this.tipBevel - slopeTop)], vertical:false})
		}

		return polygonateMesh(getSculptureMesh(layers, matrix3D))
	},
	octagonalEdgeDivider: 1.0 + Math.sqrt(2.0),
	processStatement: function(registry, statement) {
		this.bottomBaseHeight = getFloatByDefault('bottomBaseHeight', registry, statement, this.tag, 0.0)
		this.bottomDowelHeight = getFloatByDefault('bottomDowelHeight', registry, statement, this.tag, 0.0)
		var cx = getFloatByDefault('cx', registry, statement, this.tag, 0.0)
		var cy = getFloatByDefault('cy', registry, statement, this.tag, 0.0)
		var overhangAngle = getFloatByDefault('overhangAngle', registry, statement, this.tag, 40.0) * gRadiansPerDegree
		var radius = getFloatByDefault('r', registry, statement, this.tag, 10.0)
		this.slope = getFloatByDefault('slope', registry, statement, this.tag, this.defaultSlope)
		this.tipBevel = getFloatByDefault('tipBevel', registry, statement, this.tag, 1.0)
		this.topBaseHeight = getFloatByDefault('topBaseHeight', registry, statement, this.tag, 0.0)
		this.topDowelHeight = getFloatByDefault('topDowelHeight', registry, statement, this.tag, 0.0)
		var widening = getFloatByDefault('widening', registry, statement, this.tag, 0.0)
		statement.tag = 'polygon'
		var center = [0.0, 0.0]
		var edge = radius / this.octagonalEdgeDivider
		var dowelPolygon = [[radius - (radius - edge) * Math.tan(overhangAngle), -radius], [radius, -edge]]
		addMirrorPoints({center:center, vector:[1.0, 0.0]}, dowelPolygon.length, dowelPolygon)
		addArraysByIndex(dowelPolygon, widening, 0)
		addMirrorPoints({center:center, vector:[0.0, 1.0]}, dowelPolygon.length, dowelPolygon)
		add2Ds(dowelPolygon, [cx, cy])
		if (this.bottomBaseHeight == 0.0 && this.bottomDowelHeight == 0.0 && this.topBaseHeight == 0.0 && this.topDowelHeight == 0.0) {
			setPointsExcept(dowelPolygon, registry, statement)
			return
		}

		var matrix3D = getChainMatrix3D(registry, statement)
		analyzeOutputMesh(this.getDowelMesh(dowelPolygon, matrix3D, registry, statement), registry, statement)
	},
	tag: 'dowel'
}

var gGear = {
	getGear: function(gearObject, pitchRadius, sectorDegree, startAngle, teeth) {
		if (sectorDegree == 0.0) {
			return this.getRack(gearObject, pitchRadius, sectorDegree, startAngle, teeth)
		}

		return this.getInvoluteGear(gearObject, pitchRadius, sectorDegree, startAngle, teeth)
	},
	getInvoluteGear: function(gearObject, pitchRadius, sectorDegree, startAngle, teeth) {
		var baseRadius = Math.cos(gearObject.pressureAngle) * pitchRadius
		var basePitchDistance = Math.sin(gearObject.pressureAngle) * pitchRadius
		var startOffset = startAngle * pitchRadius
		var zeroAngleDistance = basePitchDistance - gearObject.pressureAngle * baseRadius
		var involuteEndAngle = gearObject.pressureAngle * 1.3
		var involuteBeginAngle = 0.0
		if (gearObject.dedendum != undefined) {
			var distance = pitchRadius - gearObject.dedendum
			involuteBeginAngle = (Math.sqrt(distance * distance - baseRadius * baseRadius) - zeroAngleDistance) / baseRadius
			distance = pitchRadius + gearObject.addendum
			involuteEndAngle = (Math.sqrt(distance * distance - baseRadius * baseRadius) - zeroAngleDistance) / baseRadius
		}

		var profileSides = Math.ceil(gearObject.sides * 0.3)
		var profileSidesPlus = profileSides + 1
		var profilePlusDouble = profileSidesPlus * 2
		var tooth = new Array(profileSidesPlus)
		var angle = involuteBeginAngle
		var angleIncrement = (involuteEndAngle - involuteBeginAngle) / profileSides
		for (var vertexIndex = 0; vertexIndex < profileSidesPlus; vertexIndex++) {
			var toothVector = polarCounterclockwise(angle)
			var toothPoint = multiply2DScalar([toothVector[1], -toothVector[0]], zeroAngleDistance + angle * baseRadius)
			add2D(toothPoint, multiply2DScalar(toothVector, baseRadius))
			tooth[vertexIndex] = toothPoint
			angle += angleIncrement
		}

		rotate2DsVector(tooth, polarCounterclockwise(-Math.PI * 0.5 / teeth))
		addMirrorPoints({vector:[1.0, 0.0]}, tooth.length, tooth)
		var gear = []
		var rotationVector = polarCounterclockwise(gPI2 / teeth)
		var toothVector = polarCounterclockwise(startAngle)
		for (var toothIndex = 0; toothIndex < teeth; toothIndex++) {
			pushArray(gear, getRotation2DsVector(tooth, toothVector))
			rotate2DVector(toothVector, rotationVector)
		}

		return gear
	},
	getRack: function(gearObject, pitchRadius, sectorDegree, startAngle, teeth) {
		var startOffset = startAngle * pitchRadius
		var tanPressure = Math.tan(gearObject.pressureAngle)
		var toothWidth = Math.PI * pitchRadius / teeth
		var halfToothWidth = toothWidth * 0.5
		var toothWavelength = toothWidth * 2.0
		var addendum = gearObject.addendum
		var dedendum = gearObject.dedendum
		var toothHeight = addendum + dedendum
		var tooth = new Array(4) 
		tooth[0] = [-dedendum * tanPressure - halfToothWidth + startOffset, -dedendum]
		tooth[1] = [addendum * tanPressure - halfToothWidth + startOffset, addendum]
		tooth[2] = [halfToothWidth - addendum * tanPressure + startOffset, addendum]
		tooth[3] = [halfToothWidth + dedendum * tanPressure + startOffset, -dedendum]
		var additionX = 0.0
		var gear = []
		for (var toothIndex = 0; toothIndex < teeth; toothIndex++) {
			pushArray(gear, addArraysByIndex(getArraysCopy(tooth), additionX, 0))
			additionX += toothWavelength
		}

		var lastPoint = gear[gear.length - 1]
		var bottom = lastPoint[1] - toothHeight
		gear.push([lastPoint[0], bottom])
		gear.push([gear[0][0], bottom])
		return gear
	},
	minimizeAddendumDedendum: function(gearObject, pitchRadius, sectorDegree, teeth) {
		if (sectorDegree == 0.0) {
			return
		}

		if (gearObject.oldDedendum == undefined) {
			var dedendum = pitchRadius * (1.0 - Math.cos(gearObject.pressureAngle))
			gearObject.dedendum = Math.min(getValueDefault(gearObject.dedendum, dedendum), dedendum)
		}
		else {
			gearObject.dedendum = gearObject.oldDedendum
		}

		gearObject.addendum = getValueDefault(gearObject.oldAddendum, gearObject.dedendum * 0.85)
	},
	processStatement: function(registry, statement) {
		this.oldAddendum = getFloatByStatement('addendum', registry, statement)
		var cx = getFloatByDefault('cx', registry, statement, this.tag, 0.0)
		var cy = getFloatByDefault('cy', registry, statement, this.tag, 0.0)
		this.oldDedendum = getFloatByStatement('dedendum', registry, statement)
		var gearDegree = getIntByDefault('gearAngle', registry, statement, this.tag, 360.0)
		var gearTeeth = getIntByDefault('gearTeeth', registry, statement, this.tag, 11)
		var pitchRadius = getFloatByDefault('pitchRadius', registry, statement, this.tag, 100.0)
		this.pressureAngle = getFloatByDefault('pressureAngle', registry, statement, this.tag, 20.0) * gRadiansPerDegree
		var sideOffset = getFloatByDefault('sideOffset', registry, statement, this.tag, 0.0)
		this.sides = getIntByDefault('sides', registry, statement, this.tag, viewBroker.numberOfBigSides.value)
		var startAngle = getFloatByDefault('startAngle', registry, statement, this.tag, 0.0) * gRadiansPerDegree
		statement.tag = 'polygon'
		startAngle += gPI2 * sideOffset / gearTeeth
		this.minimizeAddendumDedendum(this, pitchRadius, gearSectorDegree, gearTeeth)
		var gear = this.getGear(this, pitchRadius, gearDegree, startAngle, gearTeeth)
		setPointsExcept(add2Ds(gear, [cx, cy]), registry, statement)
	},
	tag: 'gear'
}

var gGearSet = {
	addGear: function(center, gear, registry, statement) {
		var gearMap = new Map()
		copyKeysExcept(gearMap, statement.attributeMap, gIDTransformSet)
		if (this.gearColors.length > 0) {
			var styleJoined = 'fill:' + this.gearColors[this.gearCount % this.gearColors.length]
			if (gearMap.has('style')) {
				styleStrings = gearMap.get('style').split(';')
				for (var styleStringIndex = styleStrings.length - 1; styleStringIndex > -1; styleStringIndex--) {
					if (styleStrings[styleStringIndex].trim().startsWith('fill')) {
						styleStrings.splice(styleStringIndex, 1)
					}
				}
				styleStrings.push(styleJoined)
				styleJoined = styleStrings.join(';')
			}
			gearMap.set('style', styleJoined)
		}

		var gearStatement = getStatementByParentTag(gearMap, 0, statement, 'polygon')
		getUniqueID(this.idStart + 'gear', registry, gearStatement)
		gearStatement.generatorName = 'gear'
		setPointsHD(add2Ds(gear, center), gearStatement)
		this.gearCount += 1
	},
	processStatement: function(registry, statement) {
		this.oldAddendum = getFloatByStatement('addendum', registry, statement)
		var cx = getFloatByDefault('cx', registry, statement, this.tag, 0.0)
		var cy = getFloatByDefault('cy', registry, statement, this.tag, 0.0)
		this.oldDedendum = getFloatByStatement('dedendum', registry, statement)
		this.gearColors = getStringsByValue(getAttributeValue('gearColor', statement))
		var gearSectorDegree = getIntByDefault('gearSectorAngle', registry, statement, this.tag, 360.0)
		var gearTeeth = getIntByDefault('gearTeeth', registry, statement, this.tag, 11)
		var otherSectorDegree = getIntByDefault('otherSectorAngle', registry, statement, this.tag, 360.0)
		var otherTeeth = getIntByDefault('otherTeeth', registry, statement, this.tag, 17)
		var pitchRadius = getFloatByDefault('pitchRadius', registry, statement, this.tag, 100.0)
		this.pressureAngle = getFloatByDefault('pressureAngle', registry, statement, this.tag, 20.0) * gRadiansPerDegree
		var sideOffset = getFloatByDefault('sideOffset', registry, statement, this.tag, 0.0)
		this.sides = getIntByDefault('sides', registry, statement, this.tag, viewBroker.numberOfBigSides.value)
		var startAngle = getFloatByDefault('startAngle', registry, statement, this.tag, 0.0) * gRadiansPerDegree
		statement.tag = 'polygon'
		startAngle += gPI2 * sideOffset / gearTeeth
		convertToGroup(statement)
		this.idStart = statement.attributeMap.get('id') + '_generated_'
		removeByGeneratorName(statement.children, 'gear')

		var center = [cx, cy]
		this.gearCount = 0
		var otherRadius = pitchRadius * otherTeeth / gearTeeth
		gGear.minimizeAddendumDedendum(this, pitchRadius, gearSectorDegree, gearTeeth)
		gGear.minimizeAddendumDedendum(this, otherRadius, otherSectorDegree, otherTeeth)
		this.addGear(center, gGear.getGear(this, pitchRadius, gearSectorDegree, startAngle, gearTeeth), registry, statement)
		var otherStartAngle = -startAngle * gearTeeth / otherTeeth
		if (otherSectorDegree == 0.0) {
			center[1] -= pitchRadius
			otherStartAngle = -otherStartAngle - gPI2
			otherStartAngle += Math.PI * (0.5 * gearTeeth + 2.0 * Math.floor(otherTeeth * 0.5 - gearTeeth * 0.25)) / otherTeeth
		}
		else {
			center[0] += pitchRadius * (1.0 + otherTeeth / gearTeeth)
			otherStartAngle += Math.PI
		}

		otherStartAngle += Math.PI / otherTeeth
		this.addGear(center, gGear.getGear(this, otherRadius, otherSectorDegree, otherStartAngle, otherTeeth), registry, statement)
	},
	tag: 'gearSet'
}

var gPulley = {
	processStatement: function(registry, statement) {
		statement.tag = 'polygon'
		var cx = getFloatByDefault('cx', registry, statement, this.tag, 0.0)
		var cy = getFloatByDefault('cy', registry, statement, this.tag, 0.0)
		var fromAngle = getFloatByDefault('fromAngle', registry, statement, this.tag, 0.0) * gRadiansPerDegree
		var fromDistance = getFloatByDefault('fromDistance', registry, statement, this.tag, 0.0)
		var holeRadius = getFloatByDefault('holeRadius', registry, statement, this.tag, 0.0)
		var radius = getFloatByDefault('r', registry, statement, this.tag, 10.0)
		var ropeColor = getValueByKeyDefault('ropeColor', registry, statement, this.tag, '#9d4c1f')
		var ropeWidth = getFloatByDefault('ropeWidth', registry, statement, this.tag, 1.0)
		var sides = getIntByDefault('sides', registry, statement, this.tag, viewBroker.numberOfBigSides.value)
		var strokeWidth = getFloatByDefault('stroke-width', registry, statement, this.tag, 1.0)
		var toAngle = getFloatByDefault('toAngle', registry, statement, this.tag, 180.0) * gRadiansPerDegree
		var toDistance = getFloatByDefault('toDistance', registry, statement, this.tag, 0.0)
		var center = [cx, cy]
		var pulleyRadius = radius - (ropeWidth + strokeWidth) * 0.5
		var pulleyPolygon = getPolygonCenterRadiusFromTo(center, pulleyRadius, fromAngle, toAngle, sides)
		if (holeRadius > 0.0) {
			var hole = getRegularPolygon(center, 1.0, false, holeRadius, 0.0, sides, 0.0)
			hole = getDirectedPolygon(!getIsCounterclockwise(pulleyPolygon), hole)
			pulleyPolygon = getDifferencePolygons(hole, pulleyPolygon)[0]
		}

		setPointsExcept(pulleyPolygon, registry, statement)
		if (ropeWidth <= 0.0) {
			return
		}

		removeByGeneratorName(statement.children, 'pulley')
		var pulleyMap = new Map()
		var idStart = statement.attributeMap.get('id') + '_generated_'
		copyKeysExcept(pulleyMap, statement.attributeMap, gIDTransformSet)
		var pulleyStatement = getStatementByParentTag(pulleyMap, 0, statement, 'polygon')
		getUniqueID(idStart + 'pulley', registry, pulleyStatement)
		pulleyStatement.generatorName = 'pulley'
		convertToGroup(statement)
		var rope = spiralCenterRadiusOnly(center, radius, fromAngle, toAngle, sides)
		var counterclockwiseMinusHalfPi = (1.0 * (toAngle > fromAngle) - 0.5) * Math.PI
		if (fromDistance > 0.0) {
			rope.splice(0, 0, add2D(polarRadius(fromAngle - counterclockwiseMinusHalfPi, fromDistance), rope[0]))
		}

		if (toDistance > 0.0) {
			rope.push(add2D(polarRadius(toAngle + counterclockwiseMinusHalfPi, toDistance), rope[rope.length - 1]))
		}

		var ropeMap = new Map([['style', 'fill:none;stroke:' + ropeColor], ['stroke-width', ropeWidth.toString()]])
		var ropeStatement = getStatementByParentTag(ropeMap, 0, statement, 'polyline')
		getUniqueID(idStart + 'rope', registry, ropeStatement)
		ropeStatement.generatorName = 'pulley'
		setPointsHD(rope, ropeStatement)

		if (getBooleanByDefault('winch', registry, statement, this.tag, false)) {
			var ropeWraparoundMap = new Map([['style', 'fill:none;stroke:' + ropeColor], ['stroke-width', ropeWidth.toString()]])
			var ropeWraparoundStatement = getStatementByParentTag(ropeWraparoundMap, 0, statement, 'polyline')
			getUniqueID(idStart + 'ropeWraparound', registry, ropeWraparoundStatement)
			ropeWraparoundStatement.generatorName = 'pulley'
			var wraparound = spiralCenterRadiusOnly(center, radius, fromAngle, fromAngle + gPI2, sides)
			setPointsHD(wraparound, ropeWraparoundStatement)
		}

		deleteKeysExcept(statement.attributeMap, gIDTransformSet)
	},
	tag: 'pulley'
}

var gRegularPolygon = {
	processStatement: function(registry, statement) {
		var isClockwise = getBooleanByDefault('clockwise', registry, statement, this.tag, false)
		var cx = getFloatByDefault('cx', registry, statement, this.tag, 0.0)
		var cy = getFloatByDefault('cy', registry, statement, this.tag, 0.0)
		var insideness = getFloatByDefault('insideness', registry, statement, this.tag, 0.0)
		var radius = getFloatByDefault('r', registry, statement, this.tag, 1.0)
		var sideOffset = getFloatByDefault('sideOffset', registry, statement, this.tag, 0.0)
		var sides = getIntByDefault('sides', registry, statement, this.tag, viewBroker.numberOfBigSides.value)
		var startAngle = getFloatByDefault('startAngle', registry, statement, this.tag, 0.0) * gRadiansPerDegree
		statement.tag = 'polygon'
		setPointsExcept(getRegularPolygon([cx, cy], insideness, !isClockwise, radius, sideOffset, sides, startAngle), registry, statement)
	},
	tag: 'regularPolygon'
}

var gSocket = {
	getSocketMesh: function(matrix3D, registry, socketPolygon, statement) {
		var narrowedPolygons = [getWidenedPolygon(socketPolygon, -this.slope * (Math.abs(this.height) + this.extraHeight))]
		var layers = []
		if (this.height < 0.0) {
			layers.push({matrix3D:this.height - this.extraHeight, polygons:narrowedPolygons})
		}

		layers.push({matrix3D:0.0, polygons:[socketPolygon], vertical:false})
		if (this.height > 0.0) {
			layers.push({matrix3D:this.height + this.extraHeight, polygons:narrowedPolygons})
		}

		return polygonateMesh(getSculptureMesh(layers, matrix3D))
	},
	processStatement: function(registry, statement) {
		var backFrontBevel = getFloatByDefault('backFrontBevel', registry, statement, this.tag, 1.0)
		var backFrontSpace = getFloatByDefault('backFrontSpace', registry, statement, this.tag, 1.0)
		var cx = getFloatByDefault('cx', registry, statement, this.tag, 0.0)
		var cy = getFloatByDefault('cy', registry, statement, this.tag, 0.0)
		this.extraHeight = getFloatByDefault('extraHeight', registry, statement, this.tag, 0.0)
		this.height = getFloatByDefault('height', registry, statement, this.tag, 0.0)
		var overhangAngle = getFloatByDefault('overhangAngle', registry, statement, this.tag, 40.0) * gRadiansPerDegree
		var radius = getFloatByDefault('r', registry, statement, this.tag, 10.0)
		this.slope = getFloatByDefault('slope', registry, statement, this.tag, gDowel.defaultSlope)
		var widening = getFloatByDefault('widening', registry, statement, this.tag, 0.0)
		statement.tag = 'polygon'
		var center = [0.0, 0.0]
		var edge = radius / gDowel.octagonalEdgeDivider
		var socketBottom = -radius - backFrontSpace
		var bottomPoint = [radius + (edge + socketBottom) * Math.tan(overhangAngle), socketBottom]
		var rightPoint = [radius, -edge]
		var socketPolygon = [bottomPoint]
		if (backFrontBevel != 0.0) {
			socketPolygon.push(multiply2DScalar(getAddition2D(bottomPoint, rightPoint), 0.5))
			bottomPoint[0] += backFrontBevel
		}

		socketPolygon.push(rightPoint)
		addMirrorPoints({center:center, vector:[1.0, 0.0]}, socketPolygon.length, socketPolygon)
		addArraysByIndex(socketPolygon, widening, 0)
		addMirrorPoints({center:center, vector:[0.0, 1.0]}, socketPolygon.length, socketPolygon)
		add2Ds(socketPolygon, [cx, cy])
		if (this.height == 0.0) {
			setPointsExcept(socketPolygon, registry, statement)
			return
		}

		var matrix3D = getChainMatrix3D(registry, statement)
		analyzeOutputMesh(this.getSocketMesh(matrix3D, registry, socketPolygon, statement), registry, statement)
	},
	tag: 'socket'
}

var gTruncatedTeardrop = {
	processStatement: function(registry, statement) {
		var cx = getFloatByDefault('cx', registry, statement, this.tag, 0.0)
		var cy = getFloatByDefault('cy', registry, statement, this.tag, 0.0)
		var maximumBridge = getFloatByStatement('maximumBridge', registry, statement)
		var overhangAngle = getFloatByDefault('overhangAngle', registry, statement, this.tag, 40.0) * gRadiansPerDegree
		var radius = getFloatByDefault('r', registry, statement, this.tag, 1.0)
		var sag = getFloatByDefault('sag', registry, statement, this.tag, 0.2)
		var sides = getIntByDefault('sides', registry, statement, this.tag, viewBroker.numberOfBigSides.value)
		var tipDirection = getFloatByDefault('tipDirection', registry, statement, this.tag, 90.0)
		var points = []
		var beginAngle = Math.PI - overhangAngle
		var endAngle = gPI2 + overhangAngle
		var maximumIncrement = 2.0 * Math.PI / sides
		var deltaAngle = endAngle - beginAngle
		var arcSides = Math.ceil(deltaAngle / maximumIncrement - gClose * overhangAngle)
		var angleIncrement = deltaAngle / arcSides
		var halfAngleIncrement = 0.5 * angleIncrement
		beginAngle -= halfAngleIncrement
		endAngle += halfAngleIncrement + 0.001 * overhangAngle
		var outerRadius = radius / Math.cos(halfAngleIncrement)
		for (var pointAngle = beginAngle; pointAngle < endAngle; pointAngle += angleIncrement) {
			points.push(polarRadius(pointAngle, outerRadius))
		}

		var segmentRunOverRise = (points[0][0] - points[1][0]) / (points[0][1] - points[1][1])
		var top = radius + sag
		var side = points[points.length - 1][0] - segmentRunOverRise * (top - points[0][1])
		if (maximumBridge != undefined) {
			var halfBridge = 0.5 * maximumBridge
			if (side > halfBridge) {
				top += (side - halfBridge) / segmentRunOverRise
				side = halfBridge
			}
		}

		points[0] = [-side, top]
		points[points.length - 1] = [side, top]
		rotate2DsVector(points, polarCounterclockwise((tipDirection - 90) * gRadiansPerDegree))
		add2Ds(points, [cx, cy])
		for (pointIndex = 0; pointIndex < points.length; pointIndex++) {
			point = points[pointIndex]
			points[pointIndex] = [point[0].toFixed(3), point[1].toFixed(3)]
		}

		statement.tag = 'polygon'
		setPointsExcept(points, registry, statement)
	},
	tag: 'truncatedTeardrop'
}

var gGeneratorCenterProcessors = [gCircle, gDowel, gGear, gGearSet, gPulley, gRegularPolygon, gSocket, gTruncatedTeardrop]
