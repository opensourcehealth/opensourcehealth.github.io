//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addPolygonStatement(attributeMap, generatorName, idStart, polygon, registry, statement) {
	var polygonStatement = getStatementByParentTag(attributeMap, 0, statement, 'polygon')
	getUniqueID(idStart, registry, polygonStatement)
	if (generatorName != undefined) {
		polygonStatement.generatorName = generatorName
	}

	setPointsHD(polygon, polygonStatement)
}

function addPolygonStatements(generatorName, idStart, polygons, registry, statement) {
	for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
		addPolygonStatement(new Map(), generatorName, idStart + polygonIndex.toString(), polygons[polygonIndex], registry, statement)
	}
}

var around = {
add: function(aroundPolygon, maximumLengthMinus, points, sides, vertexIndex) {
	var centerPoint = points[vertexIndex]
	var radiusAngles = this.getRadiusAngles(aroundPolygon, maximumLengthMinus, points, sides, vertexIndex)
	this.addAround(aroundPolygon, centerPoint, radiusAngles, sides)
},

addArcs: function(aroundPolygon, maximumLengthMinus, points, sides, vertexIndex) {
	var centerPoint = points[vertexIndex]
	var radiusAngles = this.getRadiusAngles(aroundPolygon, maximumLengthMinus, points, sides, vertexIndex)
	centerPoint.push(radiusAngles)
	this.addAround(aroundPolygon, centerPoint, radiusAngles, sides)
},

addAround: function(aroundPolygon, centerPoint, radiusAngles, sides) {
	if (radiusAngles == undefined) {
		return
	}

	centerPoint = centerPoint.slice(0, 2)
	var around = spiralCenterRadiusOnly(centerPoint, radiusAngles.radius, radiusAngles.beginAngle, radiusAngles.endAngle, sides)
	Vector.pushArray(aroundPolygon, around)
},

addRadiusToPoints: function(maximumLength, maximumLengthMinus, points) {
	var oldRadius = undefined
	for (var vertexIndex = 0; vertexIndex < points.length; vertexIndex++) {
		var point = points[vertexIndex]
		if (point[maximumLengthMinus] == undefined && oldRadius != undefined) {
			point.length = maximumLength
			point[maximumLengthMinus] = oldRadius
		}
		oldRadius = point[maximumLengthMinus]
	}
},

getArcLength: function(point) {
	var radiusAngles = point[point.length - 1]
	return (radiusAngles.endAngle - radiusAngles.beginAngle) * radiusAngles.radius
},

getExtraAngle: function(betweenLength, centerRadius, otherRadius) {
	var radiusDifference = Value.getValueDefault(otherRadius, 0.0) - centerRadius
	if (Math.abs(radiusDifference / betweenLength) < gClose) {
		return 0.0
	}

	return Math.asin(radiusDifference / betweenLength)
},

getPointAngle: function(along, point) {
	var radiusAngles = point[point.length - 1]
	var angle = radiusAngles.beginAngle * (1.0 - along) + radiusAngles.endAngle * along + Math.PI
	return {angle:angle, point:VectorFast.add2D(Vector.polarRadius(angle, -radiusAngles.radius), point)}
},

getPolygon: function(points, sides = 24) {
	var maximumLength = 0
	for (var point of points) {
		maximumLength = Math.max(maximumLength, point.length)
	}

	if (maximumLength < 3) {
		return points
	}

	var maximumLengthMinus = maximumLength - 1
	this.addRadiusToPoints(maximumLength, maximumLengthMinus, points)
	var aroundPolygon = []
	for (var vertexIndex = 0; vertexIndex < points.length; vertexIndex++) {
		this.add(aroundPolygon, maximumLengthMinus, points, sides, vertexIndex)
	}

	return aroundPolygon
},

getPolygonArcs: function(points, sides = 24) {
	var maximumLength = 0
	for (var point of points) {
		maximumLength = Math.max(maximumLength, point.length)
	}

	if (maximumLength < 3) {
		return points
	}

	var maximumLengthMinus = maximumLength - 1
	this.addRadiusToPoints(maximumLength, maximumLengthMinus, points)
	var aroundPolygon = []
	for (var vertexIndex = 0; vertexIndex < points.length; vertexIndex++) {
		this.addArcs(aroundPolygon, maximumLengthMinus, points, sides, vertexIndex)
	}

	return aroundPolygon
},

getRadiusAngles: function(aroundPolygon, maximumLengthMinus, points, sides, vertexIndex) {
	var centerPoint = points[vertexIndex]
	var centerRadius = centerPoint[maximumLengthMinus]
	if (centerRadius == undefined) {
		return undefined
	}

	var beginPoint = points[(vertexIndex - 1 + points.length) % points.length]
	var centerBegin = VectorFast.getSubtraction2D(beginPoint, centerPoint)
	var centerBeginLength = VectorFast.length2D(centerBegin)
	if (centerBeginLength == 0.0) {
		return undefined
	}

	VectorFast.divide2DScalar(centerBegin, centerBeginLength)
	var endPoint = points[(vertexIndex + 1) % points.length]
	var centerEnd = VectorFast.getSubtraction2D(endPoint, centerPoint)
	var centerEndLength = VectorFast.length2D(centerEnd)
	if (centerEndLength == 0.0) {
		return undefined
	}

	VectorFast.divide2DScalar(centerEnd, centerEndLength)
	var beginAngle = Math.atan2(centerBegin[1], centerBegin[0]) + Math.PI * 0.5
	var endAngle = Math.atan2(centerEnd[1], centerEnd[0]) - Math.PI * 0.5
	beginAngle += this.getExtraAngle(centerBeginLength, centerRadius, beginPoint[maximumLengthMinus])
	endAngle -= this.getExtraAngle(centerEndLength, centerRadius, endPoint[maximumLengthMinus])
	if (endAngle < beginAngle) {
		endAngle += gPI2
	}

	return {beginAngle:beginAngle, endAngle:endAngle, radius:centerRadius}
}
}

var gAround = {
	processStatement: function(registry, statement) {
		statement.tag = 'polygon'
		var sides = getIntByDefault('sides', registry, statement, this.tag, viewBroker.numberOfBigSides.value)
		setPointsExcept(around.getPolygon(getPointsHD(registry, statement), sides), registry, statement)
	},
	tag: 'around'
}

var gArrow = {
	addCurve: function(angleMultiplier, arrowPoints, barb, beginEnd, end, numberOfSides) {
		if (angleMultiplier == 1.0) {
			return
		}

		var barbEnd = VectorFast.getSubtraction2D(end, barb)
		var barbEndLength = VectorFast.length2D(barbEnd)
		if (barbEndLength == 0.0) {
			return
		}

		VectorFast.divide2DScalar(barbEnd, barbEndLength)
		var dotProduct = VectorFast.dotProduct2D(beginEnd, barbEnd)
		var angleDifference = (angleMultiplier - 1.0) * Math.acos(dotProduct) * gDegreesPerRadian
		Vector.pushArray(arrowPoints, spiralFromToAngleOnly(barb, end, angleDifference * 2.0, numberOfSides, false, false))
	},
	addTip: function(
	angleMultiplier, arrowPoints, barbSlope, beginEnd, beginEndLeft, beginEndRight, end, halfThickness, numberOfSides, tip) {
		if (tip.length <= 0.0) {
			arrowPoints.push(VectorFast.add2D(VectorFast.getMultiplication2DScalar(beginEndRight, halfThickness), end))
			arrowPoints.push(VectorFast.add2D(VectorFast.getMultiplication2DScalar(beginEndLeft, halfThickness), end))
			return
		}

		var halfHeadWidth = tip.width * 0.5
		var endStemCenter = VectorFast.add2D(VectorFast.getMultiplication2DScalar(beginEnd, -tip.length), end)
		if (tip.rightMultiplier > 0.0) {
			var endStemRight = VectorFast.add2D(VectorFast.getMultiplication2DScalar(beginEndRight, halfThickness), endStemCenter)
			arrowPoints.push(endStemRight)
			var rightExtra = halfHeadWidth * tip.rightMultiplier - halfThickness
			var barb = VectorFast.getMultiplication2DScalar(beginEndRight, rightExtra)
			barb = VectorFast.add2D(VectorFast.add2D(barb, endStemRight), VectorFast.getMultiplication2DScalar(beginEnd, rightExtra * barbSlope))
			arrowPoints.push(barb)
			this.addCurve(angleMultiplier, arrowPoints, barb, beginEnd, end, numberOfSides)
		}

		arrowPoints.push(end)
		if (tip.leftMultiplier > 0.0) {
			var endStemLeft = VectorFast.add2D(VectorFast.getMultiplication2DScalar(beginEndLeft, halfThickness), endStemCenter)
			var leftExtra = halfHeadWidth * tip.leftMultiplier - halfThickness
			var barb = VectorFast.getMultiplication2DScalar(beginEndLeft, leftExtra)
			barb = VectorFast.add2D(VectorFast.add2D(barb, endStemLeft), VectorFast.getMultiplication2DScalar(beginEnd, leftExtra * barbSlope))
			this.addCurve(angleMultiplier, arrowPoints, end, [-beginEnd[0], -beginEnd[1]], barb, numberOfSides)
			arrowPoints.push(barb)
			arrowPoints.push(endStemLeft)
		}

		if (halfThickness == 0.0) {
			arrowPoints.pop()
		}
	},
	getDefinitions: function() {
		return [
		{text:'Angle Multiplier', lower:0.1, decimalPlaces:2, upper:1.5, value:1.0},
		{text:'Barb Slope', lower:-1.0, decimalPlaces:2, upper:1.0, value:0.0},
		{text:'Head Left Multiplier', lower:0.0, decimalPlaces:2, upper:2, value:1.0},
		{text:'Head Right Multiplier', lower:0.0, decimalPlaces:2, upper:2, value:1.0},
		{text:'Head Length', lower:0.0, decimalPlaces:1, upper:this.defaultHeadLength * 2.0, value:this.defaultHeadLength},
		{text:'Head Width', lower:1.0, decimalPlaces:1, upper:this.defaultHeadWidth * 2.0, value:this.defaultHeadWidth},
		viewBroker.numberOfSides,
		{text:'Tail Left Multiplier', lower:0.0, decimalPlaces:2, upper:2, value:1.0},
		{text:'Tail Right Multiplier', lower:0.0, decimalPlaces:2, upper:2, value:1.0},
		{text:'Tail Length', lower:0.0, decimalPlaces:1, upper:this.defaultHeadLength * 2.0, value:this.defaultHeadLength},
		{text:'Tail Width', lower:1.0, decimalPlaces:1, upper:this.defaultHeadWidth * 2.0, value:this.defaultHeadWidth},
		{text:'Thickness', lower:0.0, decimalPlaces:1, upper:15, value:this.defaultThickness}]
	},
	defaultThickness: 4.0,
	defaultHeadLength: 8.0,
	defaultHeadWidth: 8.0,
	processStatement: function(registry, statement) {
		statement.tag = 'polygon'
		var points = getPointsHD(registry, statement)
		if (points.length < 2) {
			printCaller(['points.length < 2 in arrow in generatorpoints.', points, statement])
			setPointsExcept(points, registry, statement)
			return
		}

		var angleMultiplier = getFloatByDefault('angleMultiplier', registry, statement, this.tag, 1.0)
		var barbSlope = getFloatByDefault('barbSlope', registry, statement, this.tag, 0.0)
		var thickness = getFloatByDefault('thickness', registry, statement, this.tag, this.defaultThickness)
		var head = {leftMultiplier:getFloatByDefault('headLeftMultiplier', registry, statement, this.tag, 1.0)}
		head.rightMultiplier = getFloatByDefault('headRightMultiplier', registry, statement, this.tag, 1.0)
		head.length = getFloatByDefault('headLength', registry, statement, this.tag, this.defaultHeadLength)
		head.width = getFloatByDefault('headWidth', registry, statement, this.tag, this.defaultHeadWidth)
		var numberOfSides = getIntByDefault('sides', registry, statement, this.tag, viewBroker.numberOfSides.value)
		var tail = {leftMultiplier:getFloatByDefault('tailRightMultiplier', registry, statement, this.tag, 1.0)}
		tail.rightMultiplier = getFloatByDefault('tailLeftMultiplier', registry, statement, this.tag, 1.0)
		tail.length = getFloatByDefault('tailLength', registry, statement, this.tag, this.defaultHeadLength)
		tail.width = getFloatByDefault('tailWidth', registry, statement, this.tag, this.defaultHeadWidth)
		var begin = points[0]
		var end = points[1]
		var beginEnd = VectorFast.getSubtraction2D(end, begin)
		var beginEndLength = VectorFast.length2D(beginEnd)
		if (beginEndLength == 0.0) {
			printCaller(['beginEndLength == 0.0 in arrow in generatorpoints.', points, statement])
			setPointsExcept(points, registry, statement)
			return
		}

		statement.attributeMap.set('placerPoints', begin.toString() + ' ' + end.toString())
		VectorFast.divide2DScalar(beginEnd, beginEndLength)
		var beginEndLeft = [-beginEnd[1], beginEnd[0]]
		var beginEndRight = [beginEnd[1], -beginEnd[0]]
		var endBegin = [-beginEnd[0], -beginEnd[1]]
		var halfThickness = thickness * 0.5
		var arrowPoints = []
		var maximumLength = Math.max(head.length, tail.length)
		if (halfThickness == 0.0) {
			beginEndLength = Math.min(beginEndLength, maximumLength)
		}

		if (maximumLength >= beginEndLength) {
			if (head.length >= tail.length) {
				head.length = beginEndLength
				this.addTip(
				angleMultiplier, arrowPoints, barbSlope, beginEnd, beginEndLeft, beginEndRight, end, halfThickness, numberOfSides, head)
			}
			else {
				tail.length = beginEndLength
				this.addTip(
				angleMultiplier, arrowPoints, barbSlope, endBegin, beginEndRight, beginEndLeft, begin, halfThickness, numberOfSides, tail)
			}
			setPointsExcept(arrowPoints, registry, statement)
			return
		}

		this.addTip(
		angleMultiplier, arrowPoints, barbSlope, beginEnd, beginEndLeft, beginEndRight, end, halfThickness, numberOfSides, head)
		this.addTip(
		angleMultiplier, arrowPoints, barbSlope, endBegin, beginEndRight, beginEndLeft, begin, halfThickness, numberOfSides, tail)
		setPointsExcept(arrowPoints, registry, statement)
	},
	tag: 'arrow'
}

var gBeltDrive = {
	addPulley: function(pointIndex, points, registry, statement) {
		var center = points[pointIndex]
		var pulleyMap = new Map()
		MapKit.copyKeysExcept(pulleyMap, statement.attributeMap, gIDTransformSet)
		if (this.pulleyColors.length > 0) {
			var styleJoined = 'fill:' + this.pulleyColors[this.pulleyCount % this.pulleyColors.length]
			if (pulleyMap.has('style')) {
				styleStrings = pulleyMap.get('style').split(';')
				for (var styleStringIndex = styleStrings.length - 1; styleStringIndex > -1; styleStringIndex--) {
					if (styleStrings[styleStringIndex].trim().startsWith('fill')) {
						styleStrings.splice(styleStringIndex, 1)
					}
				}
				styleStrings.push(styleJoined)
				styleJoined = styleStrings.join(';')
			}
			pulleyMap.set('style', styleJoined)
		}

		var pulleyStatement = getStatementByParentTag(pulleyMap, 0, statement, 'polygon')
		getUniqueID(this.idStart + 'pulley' + this.pulleyCount, registry, pulleyStatement)
		pulleyStatement.generatorName = 'beltDrive'
		var pulleyFromAngle = 0.0
		var pulleyToAngle = Math.PI
		var radius = this.radiuses[this.pulleyCount % this.radiuses.length]
		if (this.oldRadius == undefined) {
			if (pointIndex < points.length - 1) {
				var endPoint = points[pointIndex + 1]
				var centerEnd = VectorFast.getSubtraction2D(endPoint, center)
				var centerEndLength = VectorFast.length2D(centerEnd)
				VectorFast.divide2DScalar(centerEnd, centerEndLength)
				var centerEndAngle = Math.atan2(centerEnd[1], centerEnd[0])
				var nextRadius = this.radiuses[(this.pulleyCount + 1) % this.radiuses.length]
				var extraAngle = around.getExtraAngle(centerEndLength, radius, nextRadius)
				var halfPIPlus = Math.PI * 0.5 + extraAngle
				this.fromAngle = centerEndAngle + halfPIPlus
				if (!isNaN(this.fromAngle)) {
					this.oldRadius = radius
					this.toAngle = centerEndAngle - halfPIPlus
					if (this.toAngle < this.fromAngle) {
						this.toAngle += gPI2
					}
					pulleyFromAngle = this.fromAngle
					pulleyToAngle = this.toAngle
				}
			}
		}
		else {
			if (!isNaN(this.fromAngle)) {
				var rope = spiralCenterRadiusOnly(points[pointIndex - 1], this.oldRadius, this.fromAngle, this.toAngle, this.sides)
				if (this.fromAngle < this.toAngle) {
					this.fromAngle += gPI2
				}
				pulleyFromAngle = this.toAngle
				pulleyToAngle = this.fromAngle
				Vector.pushArray(rope, spiralCenterRadiusOnly(center, radius, pulleyFromAngle, pulleyToAngle, this.sides))
				rope.push(rope[0])
				var ropeMap = new Map([['style', 'fill:none;stroke:' + this.ropeColor], ['stroke-width', this.ropeWidth.toString()]])
				var ropeStatement = getStatementByParentTag(ropeMap, 0, statement, 'polyline')
				getUniqueID(this.idStart + 'rope' + this.pulleyCount, registry, ropeStatement)
				ropeStatement.generatorName = 'beltDrive'
				setPointsHD(rope, ropeStatement)
			}
			this.oldRadius = undefined
		}

		var pulleyPolygon = getPolygonCenterRadiusFromTo(center, radius - this.averageWidth, pulleyFromAngle, pulleyToAngle, this.sides)
		if (this.holeRadius > 0.0) {
			var hole = getRegularPolygon(center, false, 1.0, this.holeRadius, 0.0, this.sides, 0.0)
			hole = getDirectedPolygon(!Polygon.isCounterclockwise(pulleyPolygon), hole)
			pulleyPolygon = Polygon.getDifferencePolygon(pulleyPolygon, hole)
		}

		setPointsHD(pulleyPolygon, pulleyStatement)
		this.pulleyCount += 1
	},
	getDefinitions: function() {
		return [
		{text:'Hole Radius', lower:0.0, decimalPlaces:1, upper:5.0, value:0.0},
		viewBroker.numberOfBigSides]
	},
	processStatement: function(registry, statement) {
		statement.tag = 'polygon'
		var points = getPointsHD(registry, statement)
		removeIdentical2DPoints(points)
		setPointsExcept(points, registry, statement)
		if (points.length < 1) {
			printCaller(['points.length < 1 in beltDrive in generatorpoints.', points, statement])
			return
		}

		this.holeRadius = getFloatByDefault('holeRadius', registry, statement, this.tag, 0.0)
		this.pulleyColors = getStringsByValue(getAttributeValue('pulleyColor', statement))
		this.radiuses = getFloatsByDefault('r', registry, statement, this.tag, [10.0])
		this.ropeColor = getValueByKeyDefault('ropeColor', registry, statement, this.tag, '#9d4c1f')
		this.ropeWidth = getFloatByDefault('ropeWidth', registry, statement, this.tag, 1.0)
		this.sides = getIntByDefault('sides', registry, statement, this.tag, viewBroker.numberOfBigSides.value)
		this.strokeWidth = getFloatByDefault('stroke-width', registry, statement, this.tag, 1.0)
		convertToGroup(statement)
		this.averageWidth = (this.ropeWidth + this.strokeWidth) * 0.5
		this.oldRadius = undefined
		this.idStart = statement.attributeMap.get('id') + '_generated_'
		removeStatementsByGeneratorName('beltDrive', registry, statement.children)
		this.pulleyCount = 0
		for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
			this.addPulley(pointIndex, points, registry, statement)
			if (pointIndex > 0 && pointIndex < points.length - 1) {
				this.addPulley(pointIndex, points, registry, statement)
			}
		}

		MapKit.deleteKeysExcept(statement.attributeMap, gIDTransformSet)
	},
	tag: 'beltDrive'
}

var gBuckle = {
	getDefinitions: function() {
		return [
		{text:'Barb Radius', lower:0.0, decimalPlaces:2, upper:1.0, value:0.1},
		{text:'Barb Right', lower:-5, decimalPlaces:1, upper:5, value:1.0},
		{text:'Barb Length', lower:1.0, decimalPlaces:1, upper:10, value:4.0},
		{text:'Barb Slope', lower:-1.0, decimalPlaces:2, upper:5, value:-0.15},
		{text:'Extra Bottom Thickness', lower:0.0, decimalPlaces:1, upper:5, value:1.0},
		{text:'Inner Corner Radius', lower:0.0, decimalPlaces:1, upper:3.0, value:1.0},
		{text:'Outer Corner Radius', lower:0.0, decimalPlaces:1, upper:2.0, value:0.5},
		{text:'Parabola Intervals', lower:3, upper:8, value:4},
		{text:'Peg Radius', lower:0.0, decimalPlaces:2, upper:1.0, value:0.1},
		{text:'Peg Width', lower:0.0, decimalPlaces:1, upper:10.0, value:0.0},
		{text:'Peg Slope', lower:0.0, decimalPlaces:2, upper:1.0, value:0.0},
		viewBroker.numberOfSides,
		{text:'Thickness', lower:0.1, decimalPlaces:1, upper:15, value:2.0},
		{text:'Tip Inset', lower:0.1, decimalPlaces:1, upper:1, value:0.5},
		{text:'Tip Radius', lower:0.0, decimalPlaces:1, upper:2.0, value:0.5}]
	},
	processStatement: function(registry, statement) {
		statement.tag = 'polygon'
		var points = getRectangularPoints(registry, statement, [10.0, 10.0])
		var barbRadius = getFloatByDefault('barbRadius', registry, statement, this.tag, 0.1)
		var barbRight = getFloatByDefault('barbRight', registry, statement, this.tag, 0.5)
		var barbLength = getFloatByDefault('barbLength', registry, statement, this.tag, 4.0)
		var barbSlope = getFloatByDefault('barbSlope', registry, statement, this.tag, -0.15)
		var extraBottomThickness = getFloatByDefault('extraBottomThickness', registry, statement, this.tag, 1.0)
		var innerCornerRadius = getFloatByDefault('innerCornerRadius', registry, statement, this.tag, 1.0)
		var outerCornerRadius = getFloatByDefault('outerCornerRadius', registry, statement, this.tag, 0.5)
		var numberOfIntervals = getFloatByDefault('parabolaIntervals', registry, statement, this.tag, 4)
		var pegRadius = getFloatByDefault('pegRadius', registry, statement, this.tag, 0.1)
		var pegWidth = getFloatByDefault('pegWidth', registry, statement, this.tag, 0.0)
		var pegSlope = getFloatByDefault('pegSlope', registry, statement, this.tag, 0.0)
		var numberOfSides = getIntByDefault('sides', registry, statement, this.tag, viewBroker.numberOfSides.value)
		var thickness = getFloatByDefault('thickness', registry, statement, this.tag, 2.0)
		var tipInset = getFloatByDefault('tipInset', registry, statement, this.tag, 0.5)
		var tipRadius = getFloatByDefault('tipRadius', registry, statement, this.tag, 0.5)
		var topRight = points[1]
		var bottomLeft = points[0]
		var bottom = bottomLeft[1]
		var left = bottomLeft[0]
		var bottomThickness = thickness + extraBottomThickness
		var innerBottom = bottom + bottomThickness
		var right = topRight[0]
		var top = topRight[1]
		var barbOuterY = top - barbLength
		var barbInnerY = barbOuterY - barbSlope * Math.abs(barbRight)
		var size = VectorFast.getSubtraction2D(topRight, bottomLeft)
		var midX = left + size[0] * 0.5
		var innerRight = right - thickness
		var bucklePoints = [[midX, bottom], [right, bottom]]
		var buckleRadiuses = [0.0, outerCornerRadius]
		if (pegWidth != 0.0) {
			var pegRight = right + pegWidth
			bucklePoints[1][0] = pegRight + bottomThickness * pegSlope
			bucklePoints.push([pegRight, bottomThickness])
			buckleRadiuses.push(pegRadius)
			bucklePoints.push([right, bottomThickness])
			buckleRadiuses.push(0.0)
		}

		var tipLeft = [innerRight + tipInset, top]
		var tipRight = [right - tipInset, top]
		if (barbRight > 0.0) {
			Vector.pushArray(bucklePoints, [[right, barbInnerY], [right + barbRight, barbOuterY], tipRight, tipLeft])
			Vector.pushArray(buckleRadiuses, [0.0, barbRadius, tipRadius, tipRadius])
		}
		else {
			Vector.pushArray(bucklePoints, [[right, barbOuterY], tipRight, tipLeft, [innerRight + barbRight, barbOuterY]])
			Vector.pushArray(buckleRadiuses, [barbRadius, tipRadius, tipRadius, barbRadius])
		}

		var barbInner = [innerRight, barbInnerY]
		if (extraBottomThickness == 0.0) {
			bucklePoints.push(barbInner)
			buckleRadiuses.push(0.0)
			bucklePoints.push([innerRight, innerBottom])
			buckleRadiuses.push(innerCornerRadius)
		}
		else {
			var to = [innerRight - extraBottomThickness, innerBottom]
			var parabola = parabolaFromToQuantityOnly(barbInner, to, numberOfIntervals, true, false)
			Vector.pushArray(bucklePoints, parabola)
			var endRadiuses = new Array(parabola.length).fill(0.0)
			endRadiuses[endRadiuses.length - 1] = innerCornerRadius
			Vector.pushArray(buckleRadiuses, endRadiuses)
		}

		bucklePoints.push([midX, innerBottom])
		buckleRadiuses.push(0.0)
		for (var pointIndex = buckleRadiuses.length - 1; pointIndex > -1; pointIndex--) {
			if (buckleRadiuses[pointIndex] != 0.0) {
				bucklePoints = getFilletedPolygonByIndexes(bucklePoints, buckleRadiuses[pointIndex], numberOfSides, [pointIndex])
			}
		}

		bucklePoints = bucklePoints.slice(1, -1)
		bucklePoints.push([midX, innerBottom])
		var centerVector = {center:[midX, 0.0], vector:[0.0, 1.0]}
		addMirrorPoints(centerVector, bucklePoints.length - 1, bucklePoints)
		setPointsExcept(bucklePoints, registry, statement)
	},
	tag: 'buckle'
}

var gCart = {
	addWheel: function(name, radius, registry, statement, wheelColor, x) {
		var wheelMap = new Map([['style', 'fill:' + wheelColor + ';stroke:black'], ['stroke-width', this.strokeWidth.toString()]])
		var wheelStatement = getStatementByParentTag(wheelMap, 0, statement, 'polygon')
		getUniqueID(this.idStart + name, registry, wheelStatement)
		wheelStatement.generatorName = 'Cart'
		setPointsHD(getRegularPolygon([x, this.wheelRadius], true, 1.0, radius, 0.0, this.sides, 0.0), wheelStatement)
	},
	getDefinitions: function() {
		return [
		{text:'Axle Radius', lower:0.0, decimalPlaces:1, upper:5.0, value:2.0},
		{text:'Bottom', lower:0.0, decimalPlaces:1, upper:10.0, value:5.0},
		{text:'From Offset', lower:-100.0, upper:100, value:0.0},
		viewBroker.numberOfBigSides,
		{text:'To Offset', lower:-100.0, upper:100, value:0.0},
		{text:'Top', lower:0.0, upper:100.0, value:40.0},
		{text:'Wheel Inset', lower:0.0, decimalPlaces:1, upper:20.0, value:10.0},
		{text:'Wheel Radius', lower:0.0, decimalPlaces:1, upper:20.0, value:10.0}]
	},
	processStatement: function(registry, statement) {
		statement.tag = 'polygon'
		var attributeMap = statement.attributeMap
		var points = getRectangularPoints(registry, statement, [10.0, 10.0])
		var axleColor = getValueByKeyDefault('axleColor', registry, statement, this.tag, '#4682b4')
		var axleRadius = getFloatByDefault('axleRadius', registry, statement, this.tag, 2.0)
		var bottom = getFloatByDefault('bottom', registry, statement, this.tag, 5.0)
		var fromOffset = getFloatByDefault('fromOffset', registry, statement, this.tag, 0.0)
		this.sides = getIntByDefault('sides', registry, statement, this.tag, viewBroker.numberOfBigSides.value)
		var toOffset = getFloatByDefault('toOffset', registry, statement, this.tag, 0.0)
		var top = getFloatByDefault('top', registry, statement, this.tag, 40.0)
		this.strokeWidth = getFloatByDefault('stroke-width', registry, statement, this.tag, 1.0)
		var wheelColor = getValueByKeyDefault('wheelColor', registry, statement, this.tag, 'gray')
		var wheelInset = getFloatByDefault('wheelInset', registry, statement, this.tag, 10.0)
		this.wheelRadius = getFloatByDefault('wheelRadius', registry, statement, this.tag, 10.0)
		var insetPlusRadius = wheelInset + this.wheelRadius
		var beginPoint = points[0]
		var endPoint = points[1]
		var pointsDistance = VectorFast.distance2D(beginPoint, endPoint)
		var left = fromOffset
		var right = pointsDistance - toOffset
		var rectangle = [[left, bottom], [right, bottom], [right, top], [left, top]]
		setPointsExcept(rectangle, registry, statement)
		var translationString = ''
		var beginEnd = VectorFast.getSubtraction2D(endPoint, beginPoint)
		var beginEndLength = VectorFast.length2D(beginEnd)
		if (beginEndLength != 0.0) {
			VectorFast.divide2DScalar(beginEnd, beginEndLength)
			var rotationMatrix = [beginEnd[0], beginEnd[1], -beginEnd[1], beginEnd[0], 0.0, 0.0]
			translationString = 'matrix(' + rotationMatrix.toString() + ') ' + translationString
		}

		translationString = 'translate(' + beginPoint[0].toString() + ', ' + beginPoint[1].toString() + ') ' + translationString
		if (attributeMap.has('transform')) {
			translationString = attributeMap.get('transform') + ' ' + translationString
		}

		attributeMap.set('transform', translationString)
		removeByGeneratorName(statement.children, 'Cart')
		var cartMap = new Map()
		this.idStart = statement.attributeMap.get('id') + '_generated_'
		MapKit.copyKeysExcept(cartMap, statement.attributeMap, gIDTransformSet)
		var cartStatement = getStatementByParentTag(cartMap, 0, statement, 'polygon')
		getUniqueID(this.idStart + 'cart', registry, cartStatement)
		cartStatement.generatorName = 'Cart'
		convertToGroup(statement)
		if (this.wheelRadius > 0.0) {
			this.addWheel('rearWheel', this.wheelRadius, registry, statement, wheelColor, left + insetPlusRadius)
			this.addWheel('frontWheel', this.wheelRadius, registry, statement, wheelColor, right - insetPlusRadius)
		}

		if (axleRadius > 0.0) {
			this.addWheel('rearAxle', axleRadius, registry, statement, axleColor, left + insetPlusRadius)
			this.addWheel('frontAxle', axleRadius, registry, statement, axleColor, right - insetPlusRadius)
		}

		var fronts = []
		for (var childIndex = 0; childIndex < statement.children.length; childIndex++) {
			var child = statement.children[childIndex]
			if (getBooleanByStatement('bringForward', registry, child) == true) {
				fronts.push(child)
				statement.children[childIndex] = undefined
			}
		}

		Vector.removeUndefineds(statement.children)
		Vector.pushArray(statement.children, fronts)
		MapKit.deleteKeysExcept(statement.attributeMap, gIDTransformSet)
	},
	tag: 'cart'
}

function getBox(registry, statement) {
	var points = getRectangularPoints(registry, statement, [10.0, 10.0])
	var pointZero = points[0]
	var maximumX = Math.max(points[0][0], points[1][0])
	var maximumY = Math.max(points[0][1], points[1][1])
	points = getRectangleCornerParameters(Math.min(points[0][0], points[1][0]), Math.min(points[0][1], points[1][1]), maximumX, maximumY)
	if (pointZero.length > 2) {
		var z = pointZero[2]
		for (var point of points) {
			point.push(z)
		}
	}

	return points
}

function getClosestPointAngle(point, polygon) {
	if (polygon.length < 1) {
		return undefined
	}

	var closestIndex = getClosestPointIndex(point, polygon)
	var centerPoint = polygon[closestIndex]
	var secondIndex = (closestIndex + 1) % polygon.length
	var secondDistanceSquared = VectorFast.distanceSquared2D(point, polygon[secondIndex])
	var thirdIndex = (closestIndex - 1 + polygon.length) % polygon.length
	if (VectorFast.distanceSquared2D(point, polygon[thirdIndex]) < secondDistanceSquared) {
		secondIndex = thirdIndex
	}

	var pointCenterAngle = Math.atan2(centerPoint[1] - point[1], centerPoint[0] - point[0])
	var endPoint = polygon[secondIndex]
	var centerEnd = VectorFast.getSubtraction2D(endPoint, centerPoint)
	var centerEndLength = VectorFast.length2D(centerEnd)
	if (centerEndLength == 0.0) {
		return {angle:pointCenterAngle, point:centerPoint}
	}

	VectorFast.divide2DScalar(centerEnd, centerEndLength)
	var pointEndAngle = Math.atan2(endPoint[1] - point[1], endPoint[0] - point[0])
	var reverseRotation = [centerEnd[0], -centerEnd[1]]
	var centerPointRotated = VectorFast.getRotation2DVector(centerPoint, reverseRotation)
	var endPointRotated = VectorFast.getRotation2DVector(endPoint, reverseRotation)
	var pointRotated = VectorFast.getRotation2DVector(point, reverseRotation)
	var centerPointRotatedX = centerPointRotated[0]
	var endPointRotatedX = endPointRotated[0]
	var pointRotatedX = pointRotated[0]
	if (pointRotatedX < centerPointRotatedX) {
		return {angle:pointCenterAngle, point:centerPoint}
	}

	if (pointRotatedX > endPointRotatedX) {
		return {angle:pointEndAngle, point:endPoint}
	}

	var along = (pointRotatedX - centerPointRotatedX) / (endPointRotatedX - centerPointRotatedX)
	var oneMinusAlong = 1.0 - along
	var closestPoint = VectorFast.getMultiplication2DScalar(centerPoint, oneMinusAlong)
	VectorFast.add2D(closestPoint, VectorFast.getMultiplication2DScalar(endPoint, along))
	return {angle:pointCenterAngle * oneMinusAlong + pointEndAngle * along, point:closestPoint}
}

function getRectangularPoints(registry, statement, valueDefault) {
	var points = getPointsHD(registry, statement)
	if (Vector.isEmpty(points)) {
		points = [valueDefault]
	}

	var pointZero = points[0]
	if (points.length == 1) {
		var point = [0.0, 0.0]
		if (pointZero.length > 2) {
			point.push(pointZero[2])
		}
		points.splice(0, 0, point)
	}

	return points
}

var gPolygon = {
	processStatement: function(registry, statement) {
		setPointsExcept(getPointsHD(registry, statement), registry, statement)
	},
	tag: 'polygon'
}

var gPolyline = {
	processStatement: function(registry, statement) {
		setPointsExcept(getPointsHD(registry, statement), registry, statement)
	},
	tag: 'polyline'
}
function bevelHeightPolygon(cornerWidth, polygon) {
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var centerPoint = polygon[vertexIndex]
		if (centerPoint[2] > 0.0) {
			var beginPoint = polygon[vertexIndex - 1]
			var endPoint = polygon[vertexIndex + 1]
			var centerBegin = Vector.normalize2D(VectorFast.getSubtraction2D(beginPoint, centerPoint))
			var centerEnd = Vector.normalize2D(VectorFast.getSubtraction2D(endPoint, centerPoint))
			var beginEnd = VectorFast.add2D([-centerBegin[0], -centerBegin[1]], centerEnd)
			var beginEndLength = VectorFast.length2D(beginEnd)
			var lengthMultiplier = cornerWidth / beginEndLength
			var beginEndLeft = [-beginEnd[1] / beginEndLength, beginEnd[0] / beginEndLength]
			var halfDistance = VectorFast.distance2D(beginEndLeft, [-centerEnd[1], centerEnd[0]]) * 0.5
			var yDown = halfDistance * halfDistance
			var topDistance = Math.sqrt(halfDistance * halfDistance - yDown * yDown) / (0.5 - yDown) * centerPoint[2]
			centerPoint.length = 2
			centerPoint.push(topDistance)
			centerPoint.push(VectorFast.multiply2DScalar(centerBegin, lengthMultiplier))
			centerPoint.push(VectorFast.multiply2DScalar(centerEnd, lengthMultiplier))
			centerPoint.push(VectorFast.multiply2DScalar(beginEndLeft, topDistance))
		}
	}

	for (var vertexIndex = polygon.length - 1; vertexIndex > -1; vertexIndex--) {
		var endPoint = polygon[vertexIndex]
		if (endPoint.length > 3) {
			var beginPoint = VectorFast.add2D(endPoint.slice(0), endPoint[3])
			beginPoint.push(1)
			polygon.splice(vertexIndex, 0, beginPoint)
			VectorFast.add2D(endPoint, endPoint[4])
		}
	}
}

var gPontoon = {
	addPontoonStatements: function(frontPolygon, backPolygon, name) {
		var centerVector = {center:[0.0, -this.betweenLength * 0.5], vector:[1.0, 0.0]}
		var backPolygon = getMirrorPoints(centerVector, backPolygon.length, backPolygon)
		var polygon = frontPolygon.concat(backPolygon)
		var idStartName = this.idStart + name
		addPolygonStatement(new Map(this.mapEntries), 'Pontoon', idStartName, polygon, this.registry, this.statement)
		addPolygonStatement(new Map(this.mapEntries), 'Pontoon', idStartName + '_front', frontPolygon, this.registry, this.statement)
		addPolygonStatement(new Map(this.mapEntries), 'Pontoon', idStartName + '_back', backPolygon, this.registry, this.statement)
	},
	getDefinitions: function() {
		return [
		{text:'Corner Width', lower:1.0, decimalPlaces:1, upper:10.0, value:5.0},
		{text:'Curve Power', lower:1.0, decimalPlaces:1, upper:3.0, value:2.0},
		{text:'Pontoon Height', lower:1.0, decimalPlaces:0, upper:50.0, value:10.0},
		{text:'Tip Corner Width', lower:0.0, decimalPlaces:0, upper:20.0, value:10.0},
		{text:'Tip Length', lower:0.0, decimalPlaces:0, upper:50.0, value:20.0}]
	},
	getInsetPolygon: function(multiplier, polygon) {
		var insetPolygon = Polyline.copy(polygon)
		for (var vertexIndex = insetPolygon.length - 1; vertexIndex > -1; vertexIndex--) {
			var point = insetPolygon[vertexIndex]
			if (point.length > 4) {
				var addition = 1 * (point.length > 6)
				insetPolygon.splice(vertexIndex + addition, 0, VectorFast.add2D(point.slice(0), VectorFast.getMultiplication2DScalar(point[5], multiplier)))
			}
		}

		for (var point of insetPolygon) {
			point.length = Math.min(point.length, 3)
		}

		return insetPolygon
	},
	getModulePolygon: function(name, roundTip, tipCornerWidth, tipHeight, tipLength) {
		var halfTipCornerWidth = tipCornerWidth * 0.5
		var right = this.moduleSize[0] * 0.5
		var top = this.moduleSize[1]
		var modulePolygon = []
		if (tipLength != 0.0) {
			modulePolygon.push([halfTipCornerWidth, top, 0.0])
		}

		if (roundTip) {
			modulePolygon[2] = this.pontoonHeight - tipHeight
		}

		modulePolygon.push([halfTipCornerWidth, top - tipLength, 0.0])
		if (!Vector.isEmpty(this.corners)) {
			var cornerEnd = this.corners[0]
			for (var cornerIndex = 1; cornerIndex < this.corners.length; cornerIndex++) {
				cornerEnd = Math.max(cornerEnd, this.corners[cornerIndex])
			}
			var distanceMultiplier = (right - halfTipCornerWidth) / Math.pow(cornerEnd - tipLength, this.curvePower)
			for (var corner of this.corners) {
				var x = right - distanceMultiplier * Math.pow(cornerEnd - corner, this.curvePower)
				modulePolygon.push([x, top - corner, this.pontoonHeight])
			}
		}

		if (tipLength != 0.0) {
			var centerPoint = modulePolygon[1]
			var endPoint = modulePolygon[2]
			var centerEnd = VectorFast.getSubtraction2D(endPoint, centerPoint)
			var centerEndLength = VectorFast.length2D(centerEnd)
			if (centerEndLength > 0.0) {
				VectorFast.multiply2DScalar(centerEnd, tipHeight / centerEndLength)
				var deltaX = Math.sqrt(tipHeight * tipHeight + tipLength * tipLength) - centerEnd[0]
				modulePolygon[0][0] += deltaX * centerEnd[0] / centerEnd[1] - centerEnd[1]
				this.tipWidths.push(modulePolygon[0][0] * 2.0)
			}
			var sideInset = modulePolygon[0][1] - modulePolygon[1][1]
			var sideLength = Math.sqrt(tipLength * tipLength + sideInset * sideInset)
			this.tipSide = [[0.0, 0.0], [0.0, getRoundedFloat(sideLength)], [tipHeight, 0.0]]
			if (this.displayTip) {
				addPolygonStatement(new Map(this.mapEntries), 'Pontoon', this.idStart + name, this.tipSide, this.registry, this.statement)
			}
		}

		modulePolygon.push([right, 0.0, 0.0])
		modulePolygon.reverse()
		var centerVector = {vector:[0.0, 1.0]}
		addMirrorPoints(centerVector, modulePolygon.length, modulePolygon)
		var addition = this.points[0].slice(0)
		addition[0] += right
		Polyline.add2D(modulePolygon, addition)
		bevelHeightPolygon(this.cornerWidth, modulePolygon)
		return modulePolygon
	},
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		statement.tag = 'polygon'
		this.points = getRectangularPoints(registry, statement, [200.0, 100.0])
		var backRoundTip = getBooleanByDefault('backRoundTip', registry, statement, statement.tag, false)
		var backTipCornerWidth = getFloatByDefault('backTipCornerWidth', registry, statement, statement.tag, 10.0)
		var backTipHeight = getFloatByDefault('backTipHeight', registry, statement, this.tag, -1)
		backTipHeight = Value.getValueNegativeDefault(backTipHeight, this.pontoonHeight)
		var backTipLength = getFloatByDefault('backTipLength', registry, statement, this.tag, 20.0)
		var betweenExtraLength = getFloatByDefault('betweenExtraLength', registry, statement, this.tag, -0.2)
		this.betweenLength = getFloatByDefault('betweenLength', registry, statement, this.tag, -1)
		var bottomArealDensity = getFloatByDefault('bottomArealDensity', registry, statement, this.tag, 0.24) * 0.0001
		this.corners = getFloatsByDefault('corners', registry, statement, statement.tag, [50.0])
		this.cornerWidth = getFloatByDefault('cornerWidth', registry, statement, this.tag, 5.0)
		this.curvePower = getFloatByDefault('curvePower', registry, statement, this.tag, 2.0)
		this.displayTip = getBooleanByDefault('displayTip', registry, statement, statement.tag, true)
		var frontRoundTip = getBooleanByDefault('frontRoundTip', registry, statement, statement.tag, false)
		var frontTipCornerWidth = getFloatByDefault('frontTipCornerWidth', registry, statement, this.tag, 10.0)
		var frontTipHeight = getFloatByDefault('frontTipHeight', registry, statement, this.tag, -1)
		frontTipHeight = Value.getValueNegativeDefault(frontTipHeight, this.pontoonHeight)
		var frontTipLength = getFloatByDefault('frontTipLength', registry, statement, this.tag, 20.0)
		var interiorDensity = getFloatByDefault('interiorDensity', registry, statement, this.tag, 26) * 0.000001
		var lidThickness = getFloatByDefault('lidThickness', registry, statement, this.tag, 1.4)
		var numberOfModules = getIntByDefault('modules', registry, statement, statement.tag, 1)
		this.panels = getFloatsByDefault('panels', registry, statement, statement.tag, [])
		var panelWidth = getFloatByDefault('panelWidth', registry, statement, this.tag, 60.0)
		this.pontoonHeight = getFloatByDefault('pontoonHeight', registry, statement, this.tag, 10.0)
		var topArealDensity = getFloatByDefault('topArealDensity', registry, statement, this.tag, 0.77) * 0.0001
		var topThickness = getFloatByDefault('topThickness', registry, statement, this.tag, 0.6)
		this.mapEntries = []
		var displayString = attributeMap.get('display')
		if (displayString != undefined) {
			this.mapEntries.push(['display', displayString])
		}

		this.moduleSize = VectorFast.getSubtraction2D(this.points[1], this.points[0])
		var interiorHeight = this.pontoonHeight + lidThickness
		this.idStart = attributeMap.get('id') + '_'
		this.registry = registry
		this.statement = statement
		this.tipWidths = []
		this.betweenLength = Value.getValueNegativeDefault(this.betweenLength, interiorHeight * 3 + topThickness * 2 + betweenExtraLength)
		removeByGeneratorName(statement.children, 'Pontoon')
		var frontBottomPolygon = this.getModulePolygon('front', frontRoundTip, frontTipCornerWidth, frontTipHeight, frontTipLength)
		var backBottomPolygon = this.getModulePolygon('back', backRoundTip, backTipCornerWidth, backTipHeight, backTipLength)
		var frontTopPolygon = this.getInsetPolygon(1.0, frontBottomPolygon)
		var backTopPolygon = this.getInsetPolygon(1.0, backBottomPolygon)
		Vector.setArraysLength(frontBottomPolygon, 2)
		Vector.setArraysLength(backBottomPolygon, 2)
		setPointsExcept([], registry, statement)
		convertToGroup(statement)
		this.addPontoonStatements(frontBottomPolygon, backBottomPolygon, 'bottom')
		this.addPontoonStatements(frontTopPolygon, backTopPolygon, 'top')
		attributeMap.delete('points')
		var betweenArea = this.betweenLength * this.moduleSize[0]
		var bottomArea = getPolygonArea(frontBottomPolygon)
		var bottomSidePerimeter = getPolygonPerimeter(frontBottomPolygon)
		var bottomSideArea = bottomSidePerimeter * interiorHeight
		var interiorVolume = bottomArea * interiorHeight
		var outsideArea = bottomArea + bottomSideArea
		var backTipBottomLength = Math.sqrt(backTipLength * backTipLength + backTipHeight * backTipHeight)
		var backTipBottomExtraLength = backTipBottomLength - backTipLength
		var frontTipBottomLength = Math.sqrt(frontTipLength * frontTipLength + frontTipHeight * frontTipHeight)
		var frontTipBottomExtraLength = frontTipBottomLength - frontTipLength
		var betweenMass = bottomArealDensity * (betweenArea + this.betweenLength * interiorHeight * 2.0) + betweenArea * topArealDensity
		var betweenVolume = betweenArea * interiorHeight
		betweenMass += betweenVolume * interiorDensity
		var bottomSideMass = bottomSideArea * bottomArealDensity
		var interiorMass = interiorVolume * interiorDensity
		var outsideMass = outsideArea * bottomArealDensity
		var topMass = bottomArea * topArealDensity
		var moduleMass = bottomSideMass + interiorMass + outsideMass + topMass
		var totalArea = betweenArea + outsideArea * numberOfModules
		var totalMass = betweenMass + moduleMass * numberOfModules
		var totalVolume = betweenVolume + interiorVolume * numberOfModules
		var flotationPerCentimeter = totalArea * 0.001
		attributeMap.set('backTipBottomLength', getRoundedFloatString(backTipBottomLength))
		attributeMap.set('backTipBottomExtraLength', getRoundedFloatString(backTipBottomExtraLength))
		attributeMap.set('backTipWidth', getRoundedFloatString(this.tipWidths[1]))
		attributeMap.set('betweenArea', getRoundedFloatString(betweenArea))
		attributeMap.set('betweenLength', getRoundedFloatString(this.betweenLength))
		attributeMap.set('betweenMass', getRoundedFloatString(betweenMass))
		attributeMap.set('bottomArea', getRoundedFloatString(bottomArea))
		attributeMap.set('bottomSideArea', getRoundedFloatString(bottomSideArea))
		attributeMap.set('bottomSideMass', getRoundedFloatString(bottomSideMass))
		attributeMap.set('bottomSidePerimeter', getRoundedFloatString(bottomSidePerimeter))
		attributeMap.set('draft', getRoundedFloatString(totalMass / flotationPerCentimeter))
		attributeMap.set('flotation', getRoundedFloatString(totalVolume * 0.001))
		attributeMap.set('flotationPerCentimeter', getRoundedFloatString(flotationPerCentimeter))
		attributeMap.set('frontTipBottomLength', getRoundedFloatString(frontTipBottomLength))
		attributeMap.set('frontTipBottomExtraLength', getRoundedFloatString(frontTipBottomExtraLength))
		attributeMap.set('frontTipWidth', getRoundedFloatString(this.tipWidths[0]))
		attributeMap.set('moduleMass', getRoundedFloatString(moduleMass))
		attributeMap.set('interiorMass', getRoundedFloatString(interiorMass))
		attributeMap.set('interiorVolume', getRoundedFloatString(interiorVolume))
		attributeMap.set('outsideArea', getRoundedFloatString(outsideArea))
		attributeMap.set('outsideMass', getRoundedFloatString(outsideMass))
		attributeMap.set('topMass', getRoundedFloatString(topMass))
		attributeMap.set('totalArea', getRoundedFloatString(totalArea))
		attributeMap.set('totalMass', getRoundedFloatString(totalMass))
		attributeMap.set('totalVolume', getRoundedFloatString(totalVolume))
		statement.attributeMap = MapKit.getSorted(attributeMap)
	},
	tag: 'pontoon'
}

var gRack = {
	addBetweenUntil: function(advance, betweenVerticals, comparisonSign, oldY, polygon, startIndex) {
		for (var extraIndex = 1; extraIndex < polygon.length; extraIndex++) {
			var nextPoint = polygon[(startIndex + extraIndex * advance + polygon.length) % polygon.length]
			if ((nextPoint[1] - oldY) * comparisonSign < 0.0) {
				return
			}
			else {
				betweenVerticals.push(nextPoint)
				oldY = nextPoint[1]
			}
		}

		return
	},
	getDefinitions: function() {
		return [
		{text:'Base Bevel', lower:0.0, decimalPlaces:1, upper:1.0, value:0.3},
		{text:'Left Right Bevel', lower:0.0, decimalPlaces:1, upper:2.0, value:0.5},
		{text:'From Offset', lower:-100.0, upper:100, value:0.0},
		{text:'Peg Radius', lower:0.0, decimalPlaces:2, upper:1.0, value:0.1},
		{text:'Peg Width', lower:0.0, decimalPlaces:1, upper:10.0, value:0.0},
		{text:'Peg Slope', lower:0.0, decimalPlaces:2, upper:1.0, value:0.0},
		viewBroker.numberOfInteriorSides,
		{text:'Thickness', lower:0.1, decimalPlaces:1, upper:15, value:2.0},
		{text:'Tip Bevel', lower:0.0, decimalPlaces:2, upper:1.0, value:0.0},
		{text:'To Offset', lower:-100.0, upper:100, value:0.0},
		{text:'Tooth Separation', lower:0.2, decimalPlaces:1, upper:10.0, value:4.0},
		{text:'Tooth Widening', lower:0.0, decimalPlaces:2, upper:1.0, value:0.0},
		{text:'Tooth Length', lower:1, decimalPlaces:1, upper:20.0, value:10.0},
		{text:'Tooth Slope', lower:0, decimalPlaces:2, upper:0.1, value:0.02}]
	},
	getBetweenVerticals: function(polygon) {
		if (polygon.length < 4) {
			return polygon
		}

		var advance = Polygon.isCounterclockwise(polygon) * 2 - 1
		var betweenVerticals = []
		var leftIndex = 0
		var lowX = Number.MAX_VALUE
		var highX = -Number.MAX_VALUE
		var rightIndex = 0
		for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
			var x = polygon[vertexIndex][0]
			if (x < lowX) {
				leftIndex = vertexIndex
				lowX = x
			}
			if (x > highX) {
				rightIndex = vertexIndex
				highX = x
			}
		}

		var leftPoint = polygon[leftIndex]
		this.addBetweenUntil(-advance, betweenVerticals, 1, leftPoint[1], polygon, leftIndex)
		betweenVerticals.reverse()
		betweenVerticals.push(leftPoint)
		this.addBetweenUntil(advance, betweenVerticals, -1, leftPoint[1], polygon, leftIndex)
		var rightPoint = polygon[rightIndex]
		var before = []
		this.addBetweenUntil(-advance, before, -1, rightPoint[1], polygon, rightIndex)
		Vector.pushArray(betweenVerticals, before.reverse())
		betweenVerticals.push(rightPoint)
		this.addBetweenUntil(advance, betweenVerticals, 1, rightPoint[1], polygon, rightIndex)
		return removeIdentical2DPoints(betweenVerticals)
	},
	getRackMesh: function(bottomLeft, bottomTooth, height, matrix3D, rackPolygon, topRight, topTooth) {
		var halfDowelHeight = this.dowelHeight * 0.5
		var outerRackPolygon = rackPolygon
		var countergon = getRegularPolygon([0.0, 0.0], true, 1.0, 1.0, 0.5, this.interiorSides, -0.5 * Math.PI)
		var clockgon = Polyline.copy(countergon).reverse()
		var middlePolygons = [rackPolygon]
		var highPolygons = [rackPolygon]
		var sculptureObject = {polygonMap:new Map(), statementMap:new Map()}
		var separation = this.fastenerSeparation
		var halfSeparation = separation * 0.5
		var heightInset = height / 3.0
		var midY = (bottomLeft[1] + topRight[1]) * 0.5
		var socketRadiusPlus = this.socketRadius + this.bottomTopBevel
		var maximumRadiusPlusWall = Math.max(this.dowelRadius, socketRadiusPlus) + this.wallThickness
		var leftPlus = bottomLeft[0] - halfSeparation + maximumRadiusPlusWall
		var rightMinus = topRight[0] - halfSeparation - maximumRadiusPlusWall
		var endIndex = Math.ceil(rightMinus / separation)
		var centers = []
		for (var dowelIndex = Math.ceil(leftPlus / separation); dowelIndex < endIndex; dowelIndex++) {
			centers.push([dowelIndex * separation + halfSeparation, midY])
		}

		if (this.bottomTopBevel > 0.0) {
			heightInset = this.bottomTopBevel * Math.tan(0.5 * Math.PI - this.overhangAngle)
			bottomLeft = VectorFast.getAddition2D(bottomLeft, [this.bottomTopBevel, this.bottomTopBevel])
			topRight = VectorFast.getAddition2D(topRight, [-this.bottomTopBevel, -this.bottomTopBevel])
			var bottomInsetTooth = getWidenedPolygon(bottomTooth, -this.bottomTopBevel)
			outerRackPolygon = this.getRackPolygon(bottomLeft, bottomInsetTooth, topRight, getWidenedPolygon(topTooth, -this.bottomTopBevel))
		}

		var bottomPolygons = [outerRackPolygon]
		var heightMinus = height - heightInset
		if (this.socketHeight != 0.0) {
			var halfSocketHeight = this.socketHeight * 0.5
			var z = this.socketHeight + this.extraSocketHeight
			var socketBaseRadius = socketRadiusPlus + this.fastenerSlope * halfSocketHeight
			var socketMiddleRadius = this.socketRadius + this.fastenerSlope * (halfSocketHeight - heightInset)
			var socketTipRadius = this.socketRadius + this.fastenerSlope * (halfSocketHeight - z)
			var socketMiddlePolygons = []
			var socketTipPolygons = []
			for (var center of centers) {
				bottomPolygons.push(Polyline.add2D(Polyline.getMultiplication2DScalar(clockgon, socketBaseRadius), center))
				socketMiddlePolygons.push(Polyline.add2D(Polyline.getMultiplication2DScalar(clockgon, socketMiddleRadius), center))
				socketTipPolygons.push(Polyline.add2D(Polyline.getMultiplication2DScalar(clockgon, socketTipRadius), center))
			}
			if (this.socketHeight > heightInset) {
				Vector.pushArray(middlePolygons, socketMiddlePolygons)
				Vector.pushArray(highPolygons, socketTipPolygons)
				z -= heightMinus
			}
			else {
				Vector.pushArray(middlePolygons, socketTipPolygons)
				z -= heightInset
			}
			for (var socketTipPolygon of socketTipPolygons) {
				for (var point of socketTipPolygon) {
					point.push(z)
				}
			}
		}

		var layers = [{polygons:bottomPolygons}]
		layers.push({matrix3D:heightInset, polygons:middlePolygons, vertical:false})
		layers.push({matrix3D:heightMinus, polygons:highPolygons, vertical:false})
		if (this.topThickness > 0.0) {
			layers.push({matrix3D:height, polygons:[rackPolygon], vertical:false})
			layers.push({matrix3D:height + this.topThickness, polygons:[this.getBetweenVerticals(rackPolygon)], vertical:true})
			return polygonateMesh(sculpture.getMesh(layers, matrix3D, undefined, sculptureObject))
		}

		var dowelBasePolygons = [outerRackPolygon]
		var dowelBaseIDs = []
		if (this.dowelHeight != 0.0) {
			var dowelBaseRadius = this.dowelRadius + this.fastenerSlope * halfDowelHeight
			var dowelBaseRadiusCountergon = Polyline.getMultiplication2DScalar(countergon, dowelBaseRadius)
			for (var centerIndex = 0; centerIndex < centers.length; centerIndex++) {
				var dowelBaseID = 'dowelBase' + centerIndex
				dowelBaseIDs.push(dowelBaseID)
				sculptureObject.polygonMap.set(dowelBaseID, Polyline.getAddition2D(dowelBaseRadiusCountergon, centers[centerIndex]))
				sculptureObject.statementMap.set(dowelBaseID, {attributeMap:new Map([['connectionID', '']])})
			}
		}

		layers.push({ids:dowelBaseIDs, matrix3D:height, polygons:dowelBasePolygons, vertical:false})
		if (this.dowelHeight != 0.0) {
			var midHeight = this.dowelHeight - this.dowelBevel * 2.0
			var dowelMidRadius = this.dowelRadius - this.fastenerSlope * (midHeight - halfDowelHeight)
			var dowelMidRadiusCountergon = Polyline.getMultiplication2DScalar(countergon, dowelMidRadius)
			var layerHeight = height + midHeight
			var middleDowelPolygons = new Array(centers.length)
			for (var centerIndex = 0; centerIndex < centers.length; centerIndex++) {
				middleDowelPolygons[centerIndex] = Polyline.getAddition2D(dowelMidRadiusCountergon, centers[centerIndex])
			}
			layers.push({matrix3D:layerHeight, polygons:middleDowelPolygons, vertical:false})
			if (this.dowelBevel > 0.0) {
				var dowelTipRadius = this.dowelRadius - this.fastenerSlope * halfDowelHeight - this.dowelBevel
				var dowelTipRadiusCountergon = Polyline.getMultiplication2DScalar(countergon, dowelTipRadius)
				var dowelTipPolygons = new Array(centers.length)
				for (var centerIndex = 0; centerIndex < centers.length; centerIndex++) {
					dowelTipPolygons[centerIndex] = Polyline.getAddition2D(dowelTipRadiusCountergon, centers[centerIndex])
				}
				layers.push({matrix3D:height + this.dowelHeight, polygons:dowelTipPolygons, vertical:false})
			}
		}

		return polygonateMesh(sculpture.getMesh(layers, matrix3D, undefined, sculptureObject))
	},
	getRackPolygon: function(bottomLeft, bottomTooth, topRight, topTooth) {
		var bottom = bottomLeft[1]
		var left = bottomLeft[0]
		var right = topRight[0]
		var top = topRight[1]
		var bottomPlus = bottom + this.leftRightBevel
		var leftBevel = left + this.leftRightBevel
		var rightBevel = right - this.leftRightBevel
		var topMinus = top - this.leftRightBevel
		var rackPolygon = []
		if (this.leftRightBevel > 0.0) {
			Vector.pushArray(rackPolygon, [[rightBevel, bottom], [right, bottomPlus], [right, topMinus], [rightBevel, topMinus]])
		}
		else {
			Vector.pushArray(rackPolygon, [[right, bottom], [right, top]])
		}

		Vector.pushArray(rackPolygon, this.getTeeth(top, leftBevel, rightBevel, topTooth).reverse())
		if (this.leftRightBevel > 0.0) {
			Vector.pushArray(rackPolygon, [[leftBevel, top], [left, topMinus], [left, bottomPlus], [leftBevel, bottom]])
		}
		else {
			Vector.pushArray(rackPolygon, [[left, top], [left, bottom]])
		}

		Vector.pushArray(rackPolygon, this.getTeeth(bottom, leftBevel, rightBevel, bottomTooth))
		return rackPolygon
	},
	getTeeth: function(height, leftBevel, rightBevel, tooth) {
		if (tooth.length == 0) {
			return tooth
		}

		var endIndex = Math.ceil((rightBevel - tooth[tooth.length - 1][0]) / this.toothSeparation)
		var teeth = []
		for (var toothIndex = Math.ceil((leftBevel - tooth[0][0]) / this.toothSeparation); toothIndex < endIndex; toothIndex++) {
			var toothCopy = Polyline.copy(tooth)
			Polyline.add2D(toothCopy, [toothIndex * this.toothSeparation, height])
			Vector.pushArray(teeth, toothCopy)
		}

		return teeth
	},
	getTooth: function(advance, toothHeight) {
		if (toothHeight == 0.0) {
			return []
		}

		var doubleBaseBevel = this.baseBevel * 2.0
		var doubleTipBevel = this.tipBevel * 2.0
		if (toothHeight < 0.0) {
			doubleBaseBevel = -doubleBaseBevel
			doubleTipBevel = -doubleTipBevel
		}

		var baseBevelSlope = doubleBaseBevel * this.toothSlope
		var tooth = []
		var toothInset = Math.abs(toothHeight * 0.5) * this.toothSlope
		var toothLeft = this.toothSeparation * 0.25 + advance
		var toothRight = this.toothSeparation * 0.75 + advance
		var toothBaseLeft = toothLeft - toothInset
		var toothBaseRight = toothRight + toothInset
		var toothTipLeft = toothLeft + toothInset
		var toothTipRight = toothRight - toothInset
		if (this.baseBevel > 0.0) {
			Vector.pushArray(tooth, [[toothBaseLeft - this.baseBevel, 0.0], [toothBaseLeft + baseBevelSlope, doubleBaseBevel]])
		}
		else {
			tooth.push([toothBaseLeft, 0.0])
		}

		if (this.tipBevel > 0.0) {
			var lengthMinusDouble = toothHeight - doubleTipBevel
			var tipBevelSlope = this.tipBevel * this.toothSlope
			Vector.pushArray(tooth, [[toothTipLeft - tipBevelSlope, lengthMinusDouble], [toothTipLeft + this.tipBevel, toothHeight]])
			Vector.pushArray(tooth, [[toothTipRight - this.tipBevel, toothHeight], [toothTipRight + tipBevelSlope, lengthMinusDouble]])
		}
		else {
			Vector.pushArray(tooth, [[toothTipLeft, toothHeight], [toothTipRight, toothHeight]])
		}

		if (this.baseBevel > 0.0) {
			Vector.pushArray(tooth, [[toothBaseRight - baseBevelSlope, doubleBaseBevel], [toothBaseRight + this.baseBevel, 0.0]])
		}
		else {
			tooth.push([toothBaseRight, 0.0])
		}

		return getWidenedPolygon(tooth, this.toothWidening)
	},
	processStatement: function(registry, statement) {
		statement.tag = 'polygon'
		var points = getRectangularPoints(registry, statement, [10.0, 10.0])
		this.baseBevel = getFloatByDefault('baseBevel', registry, statement, this.tag, 0.3)
		this.bottomAdvance = getFloatByDefault('bottomAdvance', registry, statement, this.tag, 0.0)
		var bottomToothHeight = getFloatByDefault('bottomToothHeight', registry, statement, this.tag, 0.0)
		this.bottomTopBevel = getFloatByDefault('bottomTopBevel', registry, statement, this.tag, 0.2)
		this.dowelBevel = getFloatByDefault('dowelBevel', registry, statement, this.tag, 0.5)
		this.dowelHeight = getFloatByDefault('dowelHeight', registry, statement, this.tag, 0.0)
		this.dowelRadius = getFloatByDefault('dowelRadius', registry, statement, this.tag, 5.0)
		this.extraSocketHeight = getFloatByDefault('extraSocketHeight', registry, statement, this.tag, 0.0)
		this.fastenerSeparation = getFloatByDefault('fastenerSeparation', registry, statement, this.tag, 40.0)
		this.fastenerSlope = getFloatByDefault('fastenerSlope', registry, statement, this.tag, 0.02)
		var fromOffset = getFloatByDefault('fromOffset', registry, statement, this.tag, 0.0)
		var height = getFloatByDefault('height', registry, statement, this.tag, 0.0)
		this.interiorSides = getIntByDefault('interiorSides', registry, statement, this.tag, viewBroker.numberOfInteriorSides.value)
		this.leftRightBevel = getFloatByDefault('leftRightBevel', registry, statement, this.tag, 0.5)
		this.overhangAngle = getFloatByDefault('overhangAngle', registry, statement, this.tag, 40.0) * gRadiansPerDegree
		this.socketHeight = getFloatByDefault('socketHeight', registry, statement, this.tag, 0.0)
		this.socketRadius = getFloatByDefault('socketRadius', registry, statement, this.tag, 5.0)
		this.tipBevel = getFloatByDefault('tipBevel', registry, statement, this.tag, 0.3)
		var toOffset = getFloatByDefault('toOffset', registry, statement, this.tag, 0.0)
		this.topAdvance = getFloatByDefault('topAdvance', registry, statement, this.tag, 0.0)
		this.topThickness = getFloatByDefault('topThickness', registry, statement, this.tag, 0.0)
		var topToothHeight = getFloatByDefault('topToothHeight', registry, statement, this.tag, 10.0)
		this.toothSeparation = getFloatByDefault('toothSeparation', registry, statement, this.tag, 4.0)
		this.toothSlope = getFloatByDefault('toothSlope', registry, statement, this.tag, 0.05)
		this.toothWidening = getFloatByDefault('toothWidening', registry, statement, this.tag, 0.0)
		this.wallThickness = getFloatByDefault('wallThickness', registry, statement, this.tag, 4.0)
		var topRight = points[1] 
		var bottomLeft = points[0]
		bottomLeft[0] += fromOffset
		topRight[0] -= fromOffset
		var bottomTooth = this.getTooth(this.bottomAdvance, -bottomToothHeight)
		var topTooth = this.getTooth(this.topAdvance, topToothHeight)
		var rackPolygon = this.getRackPolygon(bottomLeft, bottomTooth, topRight, topTooth)
		if (height == 0.0) {
			setPointsExcept(rackPolygon, registry, statement)
			return
		}

		var maximumSlopeInset = Math.max(bottomToothHeight, topToothHeight) * this.toothSlope
		var insetTipWidth = this.toothSeparation * 0.5 - (this.tipBevel + this.bottomTopBevel) * 2.0 - maximumSlopeInset
		if (insetTipWidth <= 0.0) {
			printCaller(['Inset tooth width is not positive in rack in generatorpoints, rack will not be made.', insetTipWidth, statement])
			return
		}

		var matrix3D = getChainMatrix3D(registry, statement)
		analyzeOutputMesh(this.getRackMesh(bottomLeft, bottomTooth, height, matrix3D, rackPolygon, topRight, topTooth), registry, statement)
	},
	tag: 'rack'
}

var gRectangle = {
processStatement: function(registry, statement) {
	statement.tag = 'polygon'
	var points = getBox(registry, statement)
	setPointsHD(points, statement)
	setPointsExcept(points, registry, statement)
},

tag: 'rectangle'
}

var gSandal = {
addArchBottom: function(sandalMesh, springBottomHeight, springPolygons) {
	for (var springPolygon of springPolygons) {
		var layers = [{matrix3D:-springBottomHeight, polygons:Polygon.getIntersectionPolygons(this.insetBevelPolygon, springPolygon)}]
		layers.push({matrix3D:this.bottomBevel - springBottomHeight, polygons:[springPolygon], vertical:false})
		layers.push({matrix3D:0, polygons:[springPolygon], vertical:false})
		embossMesh(false, [undefined], sculpture.getMesh(layers), sandalMesh)
	}
},

addArchTop: function(height, layers, springPolygons) {
	for (var archPolygonIndex = 0; archPolygonIndex < springPolygons.length; archPolygonIndex++) {
		var archPolygonID = 'archPolygon' + archPolygonIndex
		var springPolygon = springPolygons[archPolygonIndex]
		var archPolygon = this.getArchPolygon(springPolygon)
		this.sculptureObject.polygonMap.set(archPolygonID, archPolygon)
		this.sculptureObject.statementMap.set(archPolygonID, {attributeMap:new Map([['connectionID', 'soleTop']])})
		layers.push({matrix3D:height, ids:[archPolygonID], vertical:true})

		var archTopPolygon = this.getArchPolygon(getOutsetPolygon(springPolygon, -this.topBevel))
		layers.push({matrix3D:height, polygons:[Polyline.addByIndex(archTopPolygon, this.topBevel, 2)], vertical:false})
	}
},

addHeelClasp: function(id, layers, outerSign) {
	var rectangle = getRectangleCornerParameters(this.midX, this.springsFront, this.midX + this.right, this.heelStubBack + 1.0)
	if (outerSign < 0.0) {
		Polyline.addByIndex(rectangle, this.farLeft, 0)
	}

	var heelOuterBase = Polygon.getIntersectionPolygon(this.heelCupMiddle, rectangle)
	var closestPointIndex = getClosestPointIndex([this.doubleRight, -this.outset], heelOuterBase)
	heelOuterBase = getPolygonRotatedToIndex(heelOuterBase, closestPointIndex)
	var midpoint = Vector.interpolationFromToAlong2D(heelOuterBase[1], heelOuterBase[heelOuterBase.length - 2])
	var arc = spiralFromToAngleOnly(heelOuterBase[heelOuterBase.length - 1], heelOuterBase[0], 150, gFillet.sides, false, false)
	Vector.pushArray(heelOuterBase, arc)

	this.sculptureObject.polygonMap.set(id, heelOuterBase)
	this.sculptureObject.statementMap.set(id, {attributeMap:new Map([['connectionID', 'heelCup']])})
	layers.push({matrix3D:this.heelStubHeight, ids:[id], vertical:true})

	var scaleTranslate2D = getMatrix2DByScale([1.0, this.cosHeelStrapX])
	scaleTranslate2D = getMultiplied2DMatrix(getMatrix2DByTranslate([midpoint[0], this.springsFront]), scaleTranslate2D)
	var beginPillarFront = 0.02
	var endPillarFront = this.claspInsideLength + this.wallThickness
	var endPillarBack = endPillarFront + this.wallThickness
	var pillarPolygons = this.getPillarPolygons(beginPillarFront, this.wallThickness, endPillarFront, endPillarBack)
	transform2DPolylines(scaleTranslate2D, pillarPolygons)
	var pillarTop = this.heelStubHeight + this.strapClearance
	layers.push({matrix3D:pillarTop, polygons:pillarPolygons, vertical:true})

	var bar = getRectangleCornerParameters(-this.halfClaspThickness, beginPillarFront, this.halfClaspThickness, endPillarBack)
	bar = getFilletedPolygonByIndexes(bar, this.pillarFilletRadius, gFillet.sides)
	layers.push({matrix3D:pillarTop + this.wallThickness, polygons:[transform2DPoints(scaleTranslate2D, bar)], vertical:true})
},

addMetatarsalClasp: function(base, offsetRatio, rotation3D, sandalMesh) {
	var boundingBox = getBoundingBox(base)
	var center = Vector.interpolationFromToAlong2D(boundingBox[0], boundingBox[1])
	center[0] += (boundingBox[1][0] - boundingBox[0][0] - this.stemWidth) * offsetRatio
	var stemPolygon = getRegularPolygon(center, true, 0.0, this.stemRadius, 0.0, this.sides, 0.0)

	var heelClaspHalfLength = this.claspInsideLength * 0.5
	var beginPillarFront = -heelClaspHalfLength - this.wallThickness
	var endPillarFront = heelClaspHalfLength
	var endPillarBack = endPillarFront + this.wallThickness
	var pillarPolygons = this.getPillarPolygons(beginPillarFront, -heelClaspHalfLength, endPillarFront, endPillarBack)
	for (var pillarPolygon of pillarPolygons) {
		Polyline.add2D(pillarPolygon, center)
	}

	var bar = getRectangleCornerParameters(-this.halfClaspThickness, beginPillarFront, this.halfClaspThickness, endPillarBack)
	bar = getFilletedPolygonByIndexes(bar, this.pillarFilletRadius, gFillet.sides)
	Polyline.add2D(bar, center)

	var layers = [{polygons:pillarPolygons}]
	layers.push({matrix3D:this.strapClearance, polygons:pillarPolygons, vertical:true})
	layers.push({matrix3D:this.strapClearance + this.wallThickness, polygons:[bar], vertical:true})
	embossMeshes(rotation3D, true, [undefined], [sculpture.getMesh(layers)], sandalMesh)
},

addMetatarsalPillar: function(base, baseID, connectionID, height, layers, skew3D) {
	skew3D = getMultiplied3DMatrix(skew3D, getMatrix3DByTranslateZ([height]))
	this.sculptureObject.polygonMap.set(baseID, base)
	this.sculptureObject.statementMap.set(baseID, {attributeMap:new Map([['connectionID', connectionID]])})
	layers.push({matrix3D:skew3D, ids:[baseID], vertical:true})
},

addRidge: function(height, layers) {
	var ridgeSections = []
	var numberOfSides = 3
	var angle = Math.PI * 0.25
	var angleDifference = (Math.PI * 0.5 - angle) / (numberOfSides - 0.5)
	for (var sideCount = 0; sideCount < numberOfSides; sideCount++) {
		ridgeSections.push(Vector.polarCounterclockwise(angle))
		angle += angleDifference
	}

	var ridgeSectionZero = ridgeSections[0]
	var ridgeSectionLast = ridgeSections[ridgeSections.length - 1]
	Polyline.addByIndex(ridgeSections, -ridgeSectionZero[1], 1)
	var ridgeMultiplier = [this.halfRidgeWidth / ridgeSectionZero[0], this.ridgeThickness / ridgeSectionLast[1]]
	Polyline.multiply2Ds(ridgeSections, ridgeMultiplier)
	layers.push({matrix3D:height, polygons:this.getRidgeBase(ridgeSectionZero[0]), vertical:true})
	for (var sideCount = 1; sideCount < numberOfSides - 1; sideCount++) {
		var ridgeSection = ridgeSections[sideCount]
		layers.push({matrix3D:height + ridgeSection[1], polygons:this.getRidgeBase(ridgeSection[0]), vertical:false})
	}

	this.sculptureObject.polygonMap.set('ridgeBase', this.getRidgeBase(ridgeSectionLast[0])[0])
	layers.push({matrix3D:height + ridgeSectionLast[1], ids:['ridgeBase'], vertical:false})
},

addTreadBase: function(layers) {
	if (this.bottomBevel < this.treadHeight) {
		var bevelPolygons = getDifferencePolygonsByPolygons(this.sandalEnds, this.treadDifferencePolygons)
		layers.push({connectionMultiplier:100, matrix3D:this.bottomBevel, polygons:bevelPolygons, vertical:false})
		layers.push({matrix3D:this.treadHeight, polygons:bevelPolygons, vertical:true})

		var treadBottomCutouts = this.getRemovedDifferencesByWorks(this.treadDifferencePolygons, this.insetDoubleTreadPolygon)
		var treadBottomPolygons = getDifferencePolygonsByPolygons(this.sandalEnds, treadBottomCutouts)
		layers.push({matrix3D:this.treadHeight, polygons:treadBottomPolygons, vertical:true})

		var treadPlusCutouts = this.getRemovedDifferencesByWorks(this.treadDifferencePolygons, this.insetTreadPolygon)
		var treadPlusPolygons = getDifferencePolygonsByPolygons(this.sandalEnds, treadPlusCutouts)
		var treadBevelHeight = this.treadHeight + Math.tan(this.overhangAngle) * this.treadHeight
		layers.push({connectionMultiplier:100, matrix3D:treadBevelHeight, polygons:treadPlusPolygons, vertical:false})
		layers.push({matrix3D:this.belowSpringHeight, polygons:treadPlusPolygons, vertical:true})

		return
	}

	var tanBevelMinusHeight = Math.tan(this.overhangAngle) * (this.bottomBevel - this.treadHeight)
	var insetBevelMinusPolygon = getOutsetPolygon(this.shortSandalPolygon, -tanBevelMinusHeight)
	var insetBevelMinusEnds = Polygon.getDifferencePolygons(insetBevelMinusPolygon, this.intersectionRectangle)
	var insetBevelMinusPolygons = getDifferencePolygonsByPolygons(insetBevelMinusEnds, this.treadDifferencePolygons)
	layers.push({connectionMultiplier:100, matrix3D:this.treadHeight, polygons:insetBevelMinusPolygons, vertical:false})

	var tanBevelPlusTread = tanBevelMinusHeight + this.treadHeight
	var insetPlusTreadPolygon = getOutsetPolygon(this.shortSandalPolygon, -tanBevelPlusTread)
	var insetPlusTreadCutouts = this.getRemovedDifferencesByWorks(this.treadDifferencePolygons, insetPlusTreadPolygon)
	var insetPlusTreadPolygons = getDifferencePolygonsByPolygons(insetBevelMinusEnds, insetPlusTreadCutouts)
	layers.push({matrix3D:this.treadHeight, polygons:insetPlusTreadPolygons, vertical:true})

	var treadPlusCutouts = this.getRemovedDifferencesByWorks(this.treadDifferencePolygons, this.insetTreadPolygon)
	var treadPlusPolygons = getDifferencePolygonsByPolygons(this.sandalEnds, treadPlusCutouts)
	layers.push({matrix3D:this.bottomBevel, polygons:treadPlusPolygons, vertical:false})
	layers.push({matrix3D:this.belowSpringHeight, polygons:treadPlusPolygons, vertical:true})
},

addTreads: function(treadFront, treadBack) {
	var difference = treadBack - treadFront - this.treadWidth
	if (difference < 0.0) {
		return
	}

	var treadWavelength = this.treadWidth * 2.0
	var numberOfExtraTreads = Math.floor(difference / treadWavelength)
	var treadAdvance = treadWavelength
	if (numberOfExtraTreads > 0) {
		treadAdvance = difference / numberOfExtraTreads
	}

	for (var rectangleIndex = -1; rectangleIndex < numberOfExtraTreads; rectangleIndex++) {
		treadBack = treadFront + this.treadWidth
		var rectangle = getRectangleCornerParameters(this.farLeft, treadFront, this.doubleRight, treadBack)
		this.treadDifferencePolygons.push(rectangle)
		treadFront += treadAdvance
	}
},

getAddArcTread: function(arc, outsets) {
	Polyline.extend(arc, this.toeExtraLength)
	var arcs = getOutlinesQuickly(undefined, undefined, undefined, outsets, [arc], undefined)
	Vector.pushArray(this.treadDifferencePolygons, arcs)
	return arcs
},

getArchPolygon: function(intersectionPolygon) {
	var archPolygon = getPolygon3D(intersectionPolygon, this.archCenterThickness - this.topBevel)
	var backDistance = this.intersectionBack - this.archCenterY
	var backMultiplier = (this.archCenterThickness - this.archBackThickness) / backDistance / backDistance
	var frontDistance = this.archCenterY - this.intersectionFront
	var frontMultiplier = (this.archCenterThickness - this.archFrontThickness) / frontDistance / frontDistance
	for (var point of archPolygon) {
		if (point[1] > this.archCenterY) {
			var distance = point[1] - this.archCenterY
			point[2] -= distance * distance * backMultiplier
		}
		else {
			var distance = this.archCenterY - point[1]
			point[2] -= distance * distance * frontMultiplier
		}
	}

	var edgeX = getBoundingSegment(archPolygon)[1]
	swap2DPolyline(archPolygon)
	var between = this.archBeginX
	var numberOfBetweens = 2
	var numberOfBetweensPlus = numberOfBetweens + 1
	var edgeMinusBegin = edgeX - this.archBeginX
	betweenAdvance = edgeMinusBegin / numberOfBetweensPlus
	for (var betweenIndex = 0; betweenIndex < numberOfBetweensPlus; betweenIndex++) {
		addSplitPointsToPolygon(archPolygon, between) 
		between += betweenAdvance
	}

	swap2DPolyline(archPolygon)
	for (var point of archPolygon) {
		var x = point[0]
		if (x > this.archBeginX) {
			var along = (x - this.archBeginX) / edgeMinusBegin
			point[2] *= 1.0 - along * along * 0.25
		}
	}

	return archPolygon
},

getBigMetatarsalY: function(along) {
	return this.bigMetatarsalBaseFront * (1.0 - along) + this.bigMetatarsalBaseBack * along
},

getDefinitions: function() {
	return [
	{text:'Base Bevel', lower:0.0, decimalPlaces:1, upper:1.0, value:0.3},
	{text:'Left Right Bevel', lower:0.0, decimalPlaces:1, upper:2.0, value:0.5},
	{text:'From Offset', lower:-100.0, upper:100, value:0.0},
	{text:'Peg Radius', lower:0.0, decimalPlaces:2, upper:1.0, value:0.1},
	{text:'Peg Width', lower:0.0, decimalPlaces:1, upper:10.0, value:0.0},
	{text:'Peg Slope', lower:0.0, decimalPlaces:2, upper:1.0, value:0.0},
	viewBroker.numberOfInteriorSides,
	{text:'Thickness', lower:0.1, decimalPlaces:1, upper:15, value:2.0},
	{text:'Tip Bevel', lower:0.0, decimalPlaces:2, upper:1.0, value:0.0},
	{text:'To Offset', lower:-100.0, upper:100, value:0.0},
	{text:'Tooth Separation', lower:0.2, decimalPlaces:1, upper:10.0, value:4.0},
	{text:'Tooth Widening', lower:0.0, decimalPlaces:2, upper:1.0, value:0.0},
	{text:'Tooth Length', lower:1, decimalPlaces:1, upper:20.0, value:10.0},
	{text:'Tooth Slope', lower:0, decimalPlaces:2, upper:0.1, value:0.02}]
},

getDistance: function(point, sandalPolygon) {
	return polygonKit.distanceToPolygon(sandalPolygon, polygonKit.pointOnPolygon(this.shortSandalPolygon, point))
},

getFilletedHeel: function(polygon) {
	var pointIndexSet = getPointIndexSetByRegionIDs(this.cornerRegion, polygon, undefined)
	return getFilletedPolygonByIndexes(polygon, this.hellCupFilletRadius, gFillet.sides, pointIndexSet)
},

//getHeelClipMesh: function(matrix3D) {
//	return extrusion.getMesh([0.0, this.footInset - this.footGap], matrix3D, [this.heelClipPolygon])
//},

getHeelPoints: function(sandalPolygon, outset) {
	var sandalOutside = Polyline.copy(sandalPolygon)
	sandalOutside.push([this.midX, this.heelRadius, this.heelRadius + outset])
	sandalOutside = around.getPolygon(sandalOutside, this.sides / 3.0)
	var betweenY = (this.heelRadius + this.littleMetatarsalY) * 0.5
	var bigs = undefined
	var littles = undefined
	for (var vertexIndex = 0; vertexIndex < sandalOutside.length; vertexIndex++) {
		var point = sandalOutside[vertexIndex]
		var nextPoint = sandalOutside[(vertexIndex + 1) % sandalOutside.length]
		var pointY = point[1]
		var nextPointY = nextPoint[1]
		if (pointY > betweenY && nextPointY < betweenY) {
			bigs = [nextPoint, point]
		}
		else {
			if (pointY < betweenY && nextPointY > betweenY) {
				littles = [point, nextPoint]
			}
		}
	}

	var littlePoint = [littles[0][0] + (littles[0][0] - littles[1][0]) * littles[0][1] / (littles[1][1] - littles[0][1]), -outset]
	var bigPoint = [bigs[0][0] + (bigs[0][0] - bigs[1][0]) * bigs[0][1] / (bigs[1][1] - bigs[0][1]), -outset]
	var outsetHalfHeelRadius = this.heelRadius * 0.5 + outset
	var outset = [outsetHalfHeelRadius, outsetHalfHeelRadius]
	var bigHeelPoint = getOutsetBeginCenterEnd(littlePoint, bigPoint, bigs[0], outset)
	bigHeelPoint.push(outsetHalfHeelRadius)
	return [bigHeelPoint, getOutsetBeginCenterEnd(littles[0], littlePoint, bigPoint, outset)]
},

getLittleMetatarsalY: function(along) {
	return this.littleMetatarsalBaseFront * (1.0 - along) + this.littleMetatarsalBaseBack * along
},

getMetatarsalClipMesh: function(angle, base, height, innerBase, skew3D) {
	angle *= gRadiansPerDegree
	var angleVector = Vector.polarCounterclockwise(angle - Math.PI * 0.5)
	var cutMultiplier = -this.halfWallThickness - 1
	var negativeVector = [angleVector[0], -angleVector[1]]
	var topPoint = polygonKit.pointOnPolygonByAngle(base, angle)
	var bottomPoint = polygonKit.pointOnPolygonByAngle(base, Math.PI - angle)

	var cutout = [VectorFast.add2D(VectorFast.getMultiplication2DScalar(angleVector, cutMultiplier), topPoint)]
	cutout.push(VectorFast.add2D(VectorFast.getMultiplication2DScalar(angleVector, this.top), topPoint))
	cutout.push(VectorFast.add2D(VectorFast.getMultiplication2DScalar(negativeVector, this.top), bottomPoint))
	cutout.push(VectorFast.add2D(VectorFast.getMultiplication2DScalar(negativeVector, cutMultiplier), bottomPoint))

	var outsetInnerBase = getOutsetPolygon(innerBase, this.ribbonThickness)
	var baseDifference = Polygon.getDifferencePolygon(Polygon.getDifferencePolygon(base, cutout), outsetInnerBase)
	baseDifference = getFilletedPolygonByIndexes(baseDifference, this.pillarFilletRadius, gFillet.sides)

	skew3D = getMultiplied3DMatrix(skew3D, getMatrix3DByTranslateZ([height]))
	var layers = [{polygons:[baseDifference]}]
	layers.push({matrix3D:skew3D, polygons:[baseDifference], vertical:true})

	return sculpture.getMesh(layers)
},

getMetatarsalInner: function(base, offset) {
	var negativeAbsoluteOffset = -Math.abs(offset)
	var metatarsalInner = getOutsetPolygon(base, [0.5 * negativeAbsoluteOffset, 1.5 * negativeAbsoluteOffset])
	return getFilletedPolygonByIndexes(Polyline.addByIndex(metatarsalInner, 0.5 * offset, 0), this.pillarFilletRadius, gFillet.sides)
},

getOuterHeelClipMesh: function(matrix3D) {
	return extrusion.getMesh([0.0, this.heelCupHeight], matrix3D, [this.outerHeelClipPolygon])
},

getPillarPolygons: function(beginPillarFront, beginPillarBack, endPillarFront, endPillarBack) {
	var pillarPolygons = []
	var pillar = getRectangleCornerParameters(-this.halfClaspThickness, beginPillarFront, this.halfClaspThickness, beginPillarBack)
	pillar = getFilletedPolygonByIndexes(pillar, this.pillarFilletRadius, gFillet.sides)
	pillarPolygons.push(pillar)
	var pillar = getRectangleCornerParameters(-this.halfClaspThickness, endPillarFront, this.halfClaspThickness, endPillarBack)
	pillar = getFilletedPolygonByIndexes(pillar, this.pillarFilletRadius, gFillet.sides)
	pillarPolygons.push(pillar)
	return pillarPolygons
},

getRectangleCouple: function(endHalfLength, endHalfWidth, middleHalfLength, middleHalfWidth) {
	var rectangleCouple = [[-middleHalfLength, -middleHalfWidth], [, -endHalfWidth], [-endHalfLength, undefined]]
	Vector.setUndefinedArraysToPrevious(rectangleCouple)
	var center = [0.0, 0.0]
	addMirrorPoints({center:center, vector:[1.0, 0.0]}, rectangleCouple.length, rectangleCouple)
	addMirrorPoints({center:center, vector:[0.0, 1.0]}, rectangleCouple.length, rectangleCouple)
	return rectangleCouple
},

getRemovedDifferences: function(workPolygon, toolPolygon) {
	var differences = Polygon.getDifferencePolygons(workPolygon, toolPolygon)
	for (var difference of differences) {
		Polyline.removeClose(difference, toolPolygon)
	}

	return differences
},

getRemovedDifferencesByWorks: function(workPolygons, toolPolygon) {
	var differences = []
	for (var workPolygon of workPolygons) {
		Vector.pushArray(differences, this.getRemovedDifferences(workPolygon, toolPolygon))
	}

	return differences
},

getRidgeBase: function(halfRidgeWidth) {
	var ridgeLeft = [this.bigFrontMidX, this.ridgeCenterY - this.bigRidgeDown]
	var ridgeCenter = [this.ridgeCenterX, this.ridgeCenterY]
	var ridgeRight = [this.littleFrontMidX, this.ridgeCenterY - this.littleRidgeDown]
	var ridgeline = [ridgeLeft, ridgeCenter, ridgeRight]
	var ridge = getOutlinesQuickly(undefined, undefined, undefined, [[halfRidgeWidth, halfRidgeWidth]], [ridgeline], undefined)[0]
	var intersectionRectangle = getRectangleCornerParameters(1 - this.footInset, 0, this.littleMetatarsalBaseX - 1, this.top) 
	return Polygon.getIntersectionPolygons(ridge, intersectionRectangle)
},

getSandalMesh: function(attributeMap, height, matrix3D, sandalPolygon) {
	var leftPolygon = []
	var rightPolygon = []
	for (var point of sandalPolygon) {
		if (point[0] < this.midX) {
			leftPolygon.push(point)
		}
		else {
			rightPolygon.push(point)
		}
	}

	var bevelLower = -this.topBevel * Math.tan(Math.PI / 6.0)
	var deltaBevel = -this.topBevel * Math.tan(Math.PI / 3.0)
	var bevelUpper = bevelLower + deltaBevel
	var doubleBevel = this.bottomBevel * 2.0
	this.farLeft = -this.right
	var metatarsalFilletRadius = this.wallThickness * 2.0
	var metatarsalOutset = this.wallThickness * 0.75
	this.stemRadius = this.stemWidth * 0.5

	leftPolygon.reverse()
	leftPolygon = getPolygonRotatedToLower(leftPolygon, 1)
	var leftPolyline = getPolylineSlice(this.bigMetatarsalBaseFront, this.bigMetatarsalBaseBack, leftPolygon, 1)
	leftPolyline.reverse()
	var leftPolylineZeroX = leftPolyline[0][0]
	var leftPolylineLastX = leftPolyline[leftPolyline.length - 1][0]
	var bigBackMidX = (leftPolylineLastX - this.footInset) * 0.5
	this.bigFrontMidX = (leftPolylineZeroX - this.footInset) * 0.5
	this.bigMetatarsalBase = [[bigBackMidX, this.bigMetatarsalBaseFront]]
	this.bigMetatarsalBase.push([bigBackMidX * 0.25 - this.footInset * 0.75, this.getBigMetatarsalY(0.12)])
	this.bigMetatarsalBase.push([-this.footInset, this.getBigMetatarsalY(0.24)])
	this.bigMetatarsalBase.push([-this.footInset, this.getBigMetatarsalY(0.76)])
	this.bigMetatarsalBase.push([this.bigFrontMidX * 0.25 - this.footInset * 0.75, this.getBigMetatarsalY(0.88)])
	this.bigMetatarsalBase.push([this.footInset * 0.25 + this.bigFrontMidX * 1.25, this.bigMetatarsalBaseBack])
	Vector.pushArray(this.bigMetatarsalBase, leftPolyline)
	this.bigMetatarsalBase = getFilletedPolygonByIndexes(this.bigMetatarsalBase, metatarsalFilletRadius, gFillet.sides)
	this.bigMetatarsalInner = this.getMetatarsalInner(this.bigMetatarsalBase, metatarsalOutset)

	this.bigMetatarsalZ = height + this.bigMetatarsalBaseHeight
	var leftRotation3D = getMatrix3DRotateY([-this.strapYAngle, -this.footInset, 0.0, this.bigMetatarsalZ])
	var leftSkew3D = getMatrix3DBySkewZX([this.strapYAngle, -this.footInset, 0.0, this.bigMetatarsalZ])
	var bigRotation3D = getMatrix3DRotateX([this.strapXAngle, 0.0, this.bigMetatarsalY, this.bigMetatarsalZ])
	this.bigSkew3D = getMatrix3DBySkewZY([-this.strapXAngle, 0.0, this.bigMetatarsalY, this.bigMetatarsalZ])
	bigRotation3D = getMultiplied3DMatrix(leftRotation3D, bigRotation3D)
	this.bigSkew3D = getMultiplied3DMatrix(this.bigSkew3D, leftSkew3D)

	rightPolygon = getPolygonRotatedToLower(rightPolygon, 1)
	var rightPolyline = getPolylineSlice(this.littleMetatarsalBaseFront, this.littleMetatarsalBaseBack, rightPolygon, 1)
	var rightPolylineZeroX = rightPolyline[0][0]
	var rightPolylineLastX = rightPolyline[rightPolyline.length - 1][0]
	this.littleMetatarsalBaseX = this.right + this.footInset
	var littleBackMidX = (rightPolylineLastX + this.littleMetatarsalBaseX) * 0.5
	this.littleFrontMidX = (rightPolylineZeroX + this.littleMetatarsalBaseX) * 0.5
	this.littleMetatarsalBase = [[this.littleFrontMidX * 1.1 - this.littleMetatarsalBaseX * 0.1, this.littleMetatarsalBaseBack]]
	this.littleMetatarsalBase.push([this.littleMetatarsalBaseX * 0.75 + this.littleFrontMidX * 0.25, this.getLittleMetatarsalY(0.92)])
	this.littleMetatarsalBase.push([this.littleMetatarsalBaseX, this.getLittleMetatarsalY(0.84)])
	this.littleMetatarsalBase.push([this.littleMetatarsalBaseX, this.getLittleMetatarsalY(0.16)])
	this.littleMetatarsalBase.push([this.littleMetatarsalBaseX * 0.75 + littleBackMidX * 0.25, this.getLittleMetatarsalY(0.08)])
	this.littleMetatarsalBase.push([littleBackMidX, this.littleMetatarsalBaseFront])
	Vector.pushArray(this.littleMetatarsalBase, rightPolyline)
	this.littleMetatarsalBase = getFilletedPolygonByIndexes(this.littleMetatarsalBase, metatarsalFilletRadius, gFillet.sides)
	this.littleMetatarsalInner = this.getMetatarsalInner(this.littleMetatarsalBase, -metatarsalOutset)

	this.littleMetatarsalZ = height + this.littleMetatarsalBaseHeight
	var rightRotation3D = getMatrix3DRotateY([this.strapYAngle, this.littleMetatarsalBaseX, 0.0, this.littleMetatarsalZ])
	var rightSkew3D = getMatrix3DBySkewZX([-this.strapYAngle, this.littleMetatarsalBaseX, 0.0, this.littleMetatarsalZ])
	var littleRotation3D = getMatrix3DRotateX([this.strapXAngle, 0.0, this.littleMetatarsalY, this.littleMetatarsalZ])
	this.littleSkew3D = getMatrix3DBySkewZY([-this.strapXAngle, 0.0, this.littleMetatarsalY, this.littleMetatarsalZ])
	littleRotation3D = getMultiplied3DMatrix(rightRotation3D, littleRotation3D)
	this.littleSkew3D = getMultiplied3DMatrix(this.littleSkew3D, rightSkew3D)

	this.halfRidgeWidth = 0.5 * Value.getValueRatio(this.ridgeWidth, this.top, this.ridgeWidthRatio)
	this.ridgeCenterX = Value.getValueRatio(this.ridgeCenterX, this.right, this.ridgeCenterXRatio)
	this.ridgeCenterY = Value.getValueRatio(this.ridgeCenterY, this.top, this.ridgeCenterYRatio)
	this.bigRidgeDown = (this.ridgeCenterX - this.bigFrontMidX) * Math.tan(this.bigToeRidgeAngle)
	this.littleRidgeDown = (this.littleFrontMidX - this.ridgeCenterX) * Math.tan(this.littleToeRidgeAngle)

	var heelRadiusPlus = this.heelRadius + this.footGap
	var heelCutout = [[this.midX, heelRadiusPlus, heelRadiusPlus]]
	heelCutout.push([this.littleMetatarsalX, this.littleMetatarsalY, this.littleMetatarsalRadius])
	heelCutout.push([this.bigMetatarsalX, this.bigMetatarsalY, this.bigMetatarsalRadius])
	heelCutout = around.getPolygon(heelCutout, this.sides)
	var heelIntersectionY = this.springsFront - this.outset * 0.35 + bevelUpper
	var xFrontIntersections = []
	polygonKit.addXIntersectionsByPolygonSegment(heelCutout, -this.right, this.doubleRight, xFrontIntersections, heelIntersectionY)
	xFrontIntersections.sort(Vector.compareNumberAscending)
	var xBackIntersections = []
	polygonKit.addXIntersectionsByPolygonSegment(heelCutout, -this.right, this.doubleRight, xBackIntersections, heelIntersectionY + 1.0)
	xBackIntersections.sort(Vector.compareNumberAscending)
	var leftDeltaX = xBackIntersections[0] - xFrontIntersections[0]
	var rightDeltaX = xBackIntersections[1] - xFrontIntersections[1]
	var centerDeltaX = (xFrontIntersections[1] - xFrontIntersections[0]) * rightDeltaX / (rightDeltaX - leftDeltaX)
	var centerDeltaY = centerDeltaX * -leftDeltaX
	var center = [centerDeltaX + xFrontIntersections[0], centerDeltaY + heelIntersectionY]
	var heelCutoutPaddingOutset = getOutsetPolygon(heelCutout, this.footInset)
	var triangleBottom = center[1] - this.top
	var heelCutoutTriangle = [center]
	heelCutoutTriangle.push([center[0] + this.top / rightDeltaX, triangleBottom])
	heelCutoutTriangle.push([center[0] + this.top / leftDeltaX, triangleBottom])
	var heelPaddingCutout = Polygon.getIntersectionPolygon(heelCutoutPaddingOutset, heelCutoutTriangle)
	heelPaddingCutout = Polygon.getUnionPolygon(heelPaddingCutout, heelCutout)
	var heelClipCutout = Polygon.getDifferencePolygon(heelCutoutTriangle, getOutsetPolygon(sandalPolygon, -this.halfWallThickness))

	this.heelFilletRadius = this.right * 0.05
	var heelCupTop = height + this.heelCupHeight
//	var heelBackZ = height + this.heelBackHeight
//	var heelArcHeight = heelCupTopMinus - heelBackZ
//	var heelArcRadius = heelArcHeight / Math.sin(this.heelCupAngle)

	this.hellCupFilletRadius = this.heelFilletRadius * 0.7
	var cornerOutset = this.footInset * 0.3
	var leftHypoteneuseMultiplier = this.footInset / Math.sqrt(leftDeltaX * leftDeltaX + 1.0)
	var innerCornerLeft = [xFrontIntersections[0], heelIntersectionY]
	Vector.add2D(innerCornerLeft, Vector.multiply2DScalar([-1.0, leftDeltaX], leftHypoteneuseMultiplier))
	var rectangleLeft = getRectangleCenterOutset(innerCornerLeft, cornerOutset)
	var rightHypoteneuseMultiplier = this.footInset / Math.sqrt(rightDeltaX * rightDeltaX + 1.0)
	var innerCornerRight = [xFrontIntersections[1], heelIntersectionY]
	Vector.add2D(innerCornerRight, Vector.multiply2DScalar([1.0, -rightDeltaX], rightHypoteneuseMultiplier))
	var rectangleRight = getRectangleCenterOutset(innerCornerRight, cornerOutset)
	var splitPolygons = []
	addSplitPolygonByHeight(sandalPolygon, this.springsFront, splitPolygons)
	this.heelCup = Polygon.getDifferencePolygon(splitPolygons[0], heelPaddingCutout)
	this.heelCup = Polygon.getDifferencePolygon(this.heelCup, heelClipCutout)
	var coarseBottom = heelIntersectionY - this.outset
	var coarseRectangleLeft = getRectangleCornerParameters(this.farLeft, coarseBottom, innerCornerLeft[0] - 1.0, heelIntersectionY)
	var pointIndexSet = getPointIndexSetByRegionIDs(undefined, this.heelCup, {polygonStratas:[{polygons:[coarseRectangleLeft]}]})
	var outerCornerLeft = this.heelCup[polygonKit.closestIndexByAngle(this.heelCup, Math.PI * 0.1, pointIndexSet) + 1]
	var outerRectangleLeft = getRectangleCenterOutset(outerCornerLeft, cornerOutset)
	var coarseRectangleRight = getRectangleCornerParameters(innerCornerRight[0] + 1.0, coarseBottom, this.doubleRight, heelIntersectionY)
	var pointIndexSet = getPointIndexSetByRegionIDs(undefined, this.heelCup, {polygonStratas:[{polygons:[coarseRectangleRight]}]})
	var outerCornerRight = this.heelCup[polygonKit.closestIndexByAngle(this.heelCup, Math.PI * -0.1, pointIndexSet)]
	var outerRectangleRight = getRectangleCenterOutset(outerCornerRight, cornerOutset)
	this.cornerRegion = {polygonStratas:[{polygons:[outerRectangleLeft, outerRectangleRight, rectangleLeft, rectangleRight]}]}
	this.heelCup = this.getFilletedHeel(this.heelCup, heelClipCutout)

	this.outerHeelClipPolygon = Polygon.getIntersectionPolygon(sandalPolygon, heelCutoutTriangle)
	var insetSandalPolygon = getOutsetPolygon(sandalPolygon, -this.halfWallThickness - this.ribbonThickness)
	this.outerHeelClipPolygon = Polygon.getDifferencePolygon(this.outerHeelClipPolygon, insetSandalPolygon)
	this.outerHeelClipPolygon = getFilletedPolygonByIndexes(this.outerHeelClipPolygon, this.pillarFilletRadius, gFillet.sides)

	splitPolygons = []
	addSplitPolygonByHeight(sandalPolygon, this.heelStubBack, splitPolygons)
	this.heelCupMiddle = Polygon.getDifferencePolygon(splitPolygons[0], heelPaddingCutout)
	this.heelCupMiddle = this.getFilletedHeel(Polygon.getDifferencePolygon(this.heelCupMiddle, heelClipCutout))

	var sinHeelStrapX = Math.sin(this.heelStrapXAngle * gRadiansPerDegree)
	this.heelStubHeight = heelCupTop + 1.0
	var heelCornerHeight = this.heelStubHeight - this.claspLengthPlus * sinHeelStrapX - this.halfWallThickness

	var heelSplitY = this.springsFront - 1.0
	addSplitPointsToPolygon(this.heelCupMiddle, heelSplitY)
	this.heelCupBevelLower = Polyline.copy(this.heelCupMiddle)
	this.heelCupBevelUpper = Polyline.copy(this.heelCupMiddle)
	var bevelLowY = heelIntersectionY - this.outset * 0.5
	var outsetLower = [bevelLower, bevelLower]
	var outsetUpper = [deltaBevel, deltaBevel]
	for (var vertexIndex = 0; vertexIndex < this.heelCupMiddle.length; vertexIndex++) {
		if (this.heelCupMiddle[vertexIndex][1] < bevelLowY) {
			this.heelCupBevelLower[vertexIndex] = getOutsetPoint(this.heelCupMiddle, outsetLower, vertexIndex)
		}
	}

	for (var vertexIndex = 0; vertexIndex < this.heelCupMiddle.length; vertexIndex++) {
		if (this.heelCupBevelLower[vertexIndex][1] < heelSplitY) {
			var outsetBevel = outsetLower
			if (this.heelCupBevelLower[vertexIndex][1] < bevelLowY) {
				outsetBevel = outsetUpper
			}
			this.heelCupBevelUpper[vertexIndex] = getOutsetPoint(this.heelCupBevelLower, outsetBevel, vertexIndex)
		}
	}

	var springBottom = height - this.springThickness
	var springsBack = Math.min(this.bigMetatarsalBaseFront, this.littleMetatarsalBaseFront)
	this.intersectionBack = springsBack - this.halfWallThickness
	this.intersectionFront = this.springsFront + this.halfWallThickness
	this.intersectionRectangle = getRectangleCornerParameters(this.farLeft, this.intersectionFront, this.doubleRight, this.intersectionBack)
	this.sandalEnds = Polygon.getDifferencePolygons(sandalPolygon, this.intersectionRectangle)
	this.archBackThickness = Value.getValueRatio(this.archBackThickness, this.right, this.archBackThicknessRatio)
	this.archCenterThickness = Value.getValueRatio(this.archCenterThickness, this.right, this.archCenterThicknessRatio)
	this.archFrontThickness = Value.getValueRatio(this.archFrontThickness, this.right, this.archFrontThicknessRatio)
	this.archBeginX = Value.getValueRatio(this.archBeginX, this.right, this.archBeginXRatio)
	this.archCenterY = Value.getValueRatio(this.archCenterY, this.top, this.archCenterYRatio)
	var springPolygons = this.getSpringPolygons(sandalPolygon)

	this.treadDifferencePolygons = []
	var tanBevel = this.bottomBevel * Math.tan(this.overhangAngle)
	this.shortSandalPolygon = this.getSandalPolygon(this.outset, this.sandalSkeleton)
	this.shortSandalEnds = Polygon.getDifferencePolygons(this.shortSandalPolygon, this.intersectionRectangle)
	this.insetBevelPolygon = getOutsetPolygon(this.shortSandalPolygon, -tanBevel)
	this.insetDoubleTreadPolygon = getOutsetPolygon(this.shortSandalPolygon, -2.0 * this.treadHeight)
	this.insetTreadPolygon = getOutsetPolygon(sandalPolygon, -this.treadHeight)
	this.halfTreadWidth = this.treadWidth * 0.5
	if (this.treadHeight < springBottom - gClose) {
		var outsets = [[this.halfTreadWidth, this.halfTreadWidth]]
		var angleWidening = Math.PI * 0.05
		var angleWideningNegative = -Math.PI * 0.15
		var halfPI = Math.PI * 0.5
		var toeBevel = tanBevel + Math.tan(this.overhangAngle) * this.toeExtraLength

		var littlePointAngle = around.getPointAngle(0.0, this.heelPoints[1])
		var littlePoint = littlePointAngle.point
		var bigPointAngle = around.getPointAngle(1.0, this.heelPoints[0])
		var bigPoint = bigPointAngle.point
		var littleFromAngle = littlePointAngle.angle
		var bigToAngle = bigPointAngle.angle
		var heelULower = getArcFromAngleToAngle(littlePoint, littleFromAngle, bigPoint, bigToAngle, 18, tanBevel)
		var heelULowers = this.getAddArcTread(heelULower, outsets)

		var heelUpperWidening = Math.PI * 0.1
		var littlePointAngle = around.getPointAngle(0.7, this.heelPoints[1])
		var littlePoint = littlePointAngle.point
		var bigPointAngle = around.getPointAngle(0.3, this.heelPoints[0])
		var bigPoint = bigPointAngle.point
		var littleFromAngle = littlePointAngle.angle - heelUpperWidening
		var bigToAngle = bigPointAngle.angle + heelUpperWidening
		var heelUUpper = getArcFromAngleToAngle(littlePoint, littleFromAngle, bigPoint, bigToAngle, this.sides, tanBevel)
		var heelUUppers = this.getAddArcTread(heelUUpper, outsets)

		var littlePointAngle = around.getPointAngle(0.5, this.littleToePoint)
		var littlePoint = littlePointAngle.point
		var bigEnd = around.getPointAngle(1.0, this.bigToePoint).point
		var metatarsalBegin = around.getPointAngle(0.0, this.bigMetatarsalPoint).point
		var metatarsalBig = VectorFast.getSubtraction2D(bigEnd, metatarsalBegin)
		var littleFromAngle = littlePointAngle.angle
		var littleToPoint = Vector.interpolationFromToAlong2D(metatarsalBegin, bigEnd, 0.6)
		var littleToAngle = Math.atan2(metatarsalBig[1], metatarsalBig[0]) - halfPI
		var toeULower = getArcFromAngleToAngle(littlePoint, littleFromAngle, littleToPoint, littleToAngle, this.sides, toeBevel)
		var toeUMinimumHeightMinus = Math.min(toeULower[0][1], toeULower[toeULower.length - 1][1]) - this.treadWidth * 0.5
		var toeULowers = this.getAddArcTread(toeULower, outsets)

		var toeUpperWideningNegative = -Math.PI * 0.05
		var bigPointAngle = around.getPointAngle(0.65, this.bigToePoint)
		var bigPoint = bigPointAngle.point
		var littleEnd = around.getPointAngle(1.0, this.littleToePoint).point
		var bigBegin = around.getPointAngle(0.0, this.bigToePoint).point
		var littleBig = VectorFast.getSubtraction2D(bigBegin, littleEnd)
		var bigFromPoint = Vector.interpolationFromToAlong2D(littleEnd, bigBegin, 0.3)
		var bigFromAngle = Math.atan2(littleBig[1], littleBig[0]) + halfPI + toeUpperWideningNegative
		var bigToAngle = bigPointAngle.angle - Math.PI * 0.05
		var toeUMiddle = getArcFromAngleToAngle(bigFromPoint, bigFromAngle, bigPoint, bigToAngle, 18, toeBevel)
		var toeUMiddles = this.getAddArcTread(toeUMiddle, outsets)

		var bigPointAngle = around.getPointAngle(0.2, this.bigToePoint)
		var bigPoint = bigPointAngle.point
		var littleEnd = around.getPointAngle(1.0, this.littleToePoint).point
		var bigBegin = around.getPointAngle(0.0, this.bigToePoint).point
		var littleBig = VectorFast.getSubtraction2D(bigBegin, littleEnd)
		var bigFromPoint = Vector.interpolationFromToAlong2D(littleEnd, bigBegin, 0.6)
		var bigFromAngle = Math.atan2(littleBig[1], littleBig[0]) + halfPI + toeUpperWideningNegative
		var bigToAngle = bigPointAngle.angle - toeUpperWideningNegative
		var toeUUpper = getArcFromAngleToAngle(bigFromPoint, bigFromAngle, bigPointAngle.point, bigToAngle, 18, (toeBevel + tanBevel) * 0.5)
		var toeUUppers = this.getAddArcTread(toeUUpper, outsets)

		this.addTreads(springsBack + this.halfWallThickness, getBoundingSegment(toeULowers[0], 1)[0] - this.treadWidth)
		this.addTreads(getBoundingSegment(heelUUppers[0], 1)[1] + this.treadWidth, this.springsFront - this.halfWallThickness)
	}

	var bottomTreadPolygons = getDifferencePolygonsByPolygons(this.shortSandalEnds, this.treadDifferencePolygons)
	var layers = [{polygons:Polygon.getIntersectionPolygonsByTools(this.insetBevelPolygon, bottomTreadPolygons)}]

	var springBottomHeight = height - this.springThickness
	this.belowSpringHeight = springBottomHeight - 1
	if (this.treadHeight < springBottom - gClose) {
		this.addTreadBase(layers)
	}

	layers.push({matrix3D:springBottomHeight, polygons:this.sandalEnds, vertical:true})

	this.sculptureObject = {polygonMap:new Map([['soleTop', sandalPolygon]]), statementMap:new Map()}
	layers.push({matrix3D:height, ids:['soleTop'], vertical:true})

	var bigMetatarsalBackTread = this.bigMetatarsalBaseBack + this.halfTreadWidth
	var littleMetatarsalBackTread = this.littleMetatarsalBaseBack + this.halfTreadWidth
	var toeSubtractionPolygon = [[this.doubleRight, littleMetatarsalBackTread], [this.midX, littleMetatarsalBackTread]]
	toeSubtractionPolygon.push([this.midX, bigMetatarsalBackTread])
	toeSubtractionPolygon.push([-this.right, bigMetatarsalBackTread])
	toeSubtractionPolygon.push([-this.right, -this.top])
	toeSubtractionPolygon.push([this.doubleRight, -this.top])

	var treadHeightPlus = this.treadHeight + 1.0
	var warpedSandalPolygon = new Array(sandalPolygon.length)
	for (var vertexIndex = 0; vertexIndex < sandalPolygon.length; vertexIndex++) {
		var distance = -this.getDistance(sandalPolygon[vertexIndex], sandalPolygon) * 0.5
		warpedSandalPolygon[vertexIndex] = getOutsetPoint(sandalPolygon, [distance, distance], vertexIndex)
	}

	warpedSandalPolygon = getOutsetPolygon(warpedSandalPolygon, -treadHeightPlus)
	this.toeBottom = this.getToePolygon(sandalPolygon, warpedSandalPolygon, toeSubtractionPolygon, treadHeightPlus)

	this.addRidge(height, layers)
	this.addArchTop(height, layers, springPolygons)

	var toeTop = this.getToePolygon(sandalPolygon, getOutsetPolygon(sandalPolygon, -treadHeightPlus), toeSubtractionPolygon, treadHeightPlus)
	toeTop = Polyline.copy(toeTop)
	for (var point of toeTop) {
		var rise = this.getDistance(point, sandalPolygon) / Math.tan(this.overhangAngle)
		point.push(Math.max(rise, this.paddingThickness + 1))
	}

	this.sculptureObject.polygonMap.set('toeBottom', this.toeBottom)
	this.sculptureObject.statementMap.set('toeBottom', {attributeMap:new Map([['connectionID', 'soleTop']])})
	layers.push({matrix3D:height + this.paddingThickness, ids:['toeBottom'], vertical:true})
	layers.push({matrix3D:height, polygons:[toeTop], vertical:false})

	this.addMetatarsalPillar(this.bigMetatarsalInner, 'bigMetatarsal', 'soleTop', this.bigMetatarsalZ, layers, this.bigSkew3D)
	this.addMetatarsalPillar(this.littleMetatarsalInner, 'littleMetatarsal', 'soleTop', this.littleMetatarsalZ, layers, this.littleSkew3D)

	this.sculptureObject.polygonMap.set('heelCupBottom', this.heelCup)
	this.sculptureObject.statementMap.set('heelCupBottom', {attributeMap:new Map([['connectionID', 'soleTop']])})
	layers.push({matrix3D:height, ids:['heelCupBottom'], vertical:true})
	layers.push({matrix3D:heelCornerHeight, polygons:[this.heelCupMiddle], vertical:false})
	layers.push({matrix3D:heelCupTop - this.topBevel * 2.0, polygons:[this.heelCupMiddle], vertical:false})
	layers.push({matrix3D:heelCupTop - this.topBevel, polygons:[this.heelCupBevelLower], vertical:false})
	this.sculptureObject.polygonMap.set('heelCup', this.heelCupBevelUpper)
	layers.push({matrix3D:heelCupTop, ids:['heelCup'], vertical:false})
	this.addHeelClasp('heelInnerBase', layers, -1.0)
	this.addHeelClasp('heelOuterBase', layers, 1.0)

	var sandalMesh = polygonateMesh(sculpture.getMesh(layers, matrix3D, undefined, this.sculptureObject))
	this.addArchBottom(sandalMesh, springBottomHeight, springPolygons)
	this.addMetatarsalClasp(this.bigMetatarsalInner, 0.2, bigRotation3D, sandalMesh)
	this.addMetatarsalClasp(this.littleMetatarsalInner, -0.45, littleRotation3D, sandalMesh)

	var rotationXMatrix = getMatrix3DRotateX([90.0])
	splitMesh(undefined, this.id, rotationXMatrix, sandalMesh, undefined, undefined, [this.springsFront+.001], undefined)

	var pointIndexSet = new Set()
	var rectangle = getRectangleCornerParameters(this.farLeft, this.springsFront, this.doubleRight, this.heelStubBack + 1.0)
	addPolygonsToPointIndexSet(pointIndexSet, sandalMesh.points, [rectangle], [[this.heelStubHeight - 0.5]])
	var translationPoint = [0.0, -this.springsFront, -this.heelStubHeight]
	var translationMatrix3D = getMatrix3DByTranslate(translationPoint)
	var negativeTranslationMatrix3D = getMatrix3DByTranslate(VectorFast.multiply3DScalar(translationPoint, -1.0))
	var scaleRotation3D = getMultiplied3DMatrix(getMatrix3DByScaleY([1.0 / this.cosHeelStrapX]), translationMatrix3D)
	scaleRotation3D = getMultiplied3DMatrix(getMatrix3DRotateX([-this.heelStrapXAngle]), scaleRotation3D)
	scaleRotation3D = getMultiplied3DMatrix(negativeTranslationMatrix3D, scaleRotation3D)
	transform3DPointsBySet(scaleRotation3D, pointIndexSet, sandalMesh.points)

	var sandalMesh = polygonateMesh(sandalMesh)
	for (var point of sandalMesh.points) {
		if (point[2] < height - 0.1) {
			var edgeDistance = polygonKit.distanceToPolygon(sandalPolygon, point)
			if (edgeDistance < 1 || point[2] > this.treadHeight + 0.1) {
				point[2] += this.getDistance(point, sandalPolygon) / Math.tan(this.overhangAngle)
			}
		}
	}

	return sandalMesh
},

getSandalPolygon: function(outset, sandalSkeleton, toeExtraLength = 0.0) {
	for (var point of sandalSkeleton) {
		if (point.length > 3) {
			point.pop()
		}
	}

	sandalSkeleton[0][1] += toeExtraLength
	sandalSkeleton[1][1] += toeExtraLength
	var sandalPolygon = around.getPolygonArcs(sandalSkeleton, this.sides / 3.0)
	sandalSkeleton[0][1] -= toeExtraLength
	sandalSkeleton[1][1] -= toeExtraLength

	this.outsetHeelStub(sandalPolygon, -this.right, this.midX)
	this.outsetHeelStub(sandalPolygon, this.midX, this.doubleRight)

	var littleYBottom = this.heelStubBack * 0.66 + this.littleMetatarsalBaseFront * 0.33
	var littleYMiddle = this.heelStubBack * 0.33 + this.littleMetatarsalBaseFront * 0.66
	var offset = outset * 0.7
	this.offsetArch(-offset, sandalPolygon, this.midX, this.doubleRight, littleYBottom, littleYMiddle, this.littleMetatarsalBaseFront - 1)

	var bigYBottom = this.heelStubBack * 0.66 + this.bigMetatarsalBaseFront * 0.33
	var bigYMiddle = this.heelStubBack * 0.33 + this.bigMetatarsalBaseFront * 0.66
	this.offsetArch(offset, sandalPolygon, -this.right, this.midX, bigYBottom, bigYMiddle, this.bigMetatarsalBaseFront - 1)

	return sandalPolygon
},

getSandalSkeleton: function(outset, outsetFront) {
	var sandalSkeleton = []
	var bigToeRadius = Value.getValueRatio(this.bigToeRadius, this.right, this.bigToeRadiusRatio)
	var bigToeX = Value.getValueRatio(this.bigToeX, this.right, this.bigToeXRatio)
	var littleToeRadius = Value.getValueRatio(this.littleToeRadius, this.right, this.littleToeRadiusRatio)
	var littleToeX = Value.getValueRatio(this.littleToeX, this.right, this.littleToeXRatio)

	var bigToeY = this.top + outsetFront - outset - bigToeRadius
	var bigToe = [bigToeX, bigToeY]
	this.cosHeelStrapX = Math.cos(this.heelStrapXAngle * gRadiansPerDegree)
	this.heelRadius = this.heelWidth * 0.5
	this.heelStubBack = this.springsFront + this.claspLengthPlus * this.cosHeelStrapX
	this.heelOutsetSplitY = this.springsFront - outset * 0.4
	if (this.bigMetatarsalY < 0.0) {
		this.bigMetatarsalY = this.metatarsalYRatio * (bigToeY - this.heelRadius) + this.heelRadius
	}

	var littleToe = VectorFast.add2D(Vector.polarRadius(this.toeAngle + Math.PI * 0.5, bigToeRadius), bigToe)
	littleToe[1] += (littleToeX - littleToe[0]) * Math.sin(this.toeAngle) - littleToeRadius / Math.cos(this.toeAngle)
	if (this.littleMetatarsalY < 0.0) {
		this.littleMetatarsalY = this.metatarsalYRatio * (littleToe[1] - this.heelRadius) + this.heelRadius
	}

	this.littleMetatarsalRadius = littleToeRadius * 2.0
	this.bigMetatarsalRadius = bigToeRadius * 2.0
	var metatarsalRadius = this.bigMetatarsalRadius * 1.5
	this.littleMetatarsalBaseFront = this.littleMetatarsalY - this.halfClaspLengthWall
	this.littleMetatarsalBaseBack = this.littleMetatarsalY + this.halfClaspLengthWall
	this.bigMetatarsalBaseFront = this.bigMetatarsalY - this.halfClaspLengthWall
	this.bigMetatarsalBaseBack = this.bigMetatarsalY + this.halfClaspLengthWall

	this.littleToePoint = [littleToeX, littleToe[1], littleToeRadius + outset]
	sandalSkeleton.push(this.littleToePoint)

	this.bigToePoint = [bigToeX, bigToeY, bigToeRadius + outset]
	sandalSkeleton.push(this.bigToePoint)

	var metatarsalOutset = outset + this.wallThickness
	this.bigMetatarsalX = -this.metatarsalWidening
	this.bigMetatarsalPoint = [this.bigMetatarsalX + metatarsalRadius - metatarsalOutset, this.bigMetatarsalY, metatarsalRadius]
	sandalSkeleton.push(this.bigMetatarsalPoint)

	this.heelPoints = this.getHeelPoints(sandalSkeleton, outset)
	Vector.pushArray(sandalSkeleton, this.heelPoints)

	this.littleMetatarsalX = this.right + this.metatarsalWidening
	sandalSkeleton.push([this.littleMetatarsalX - metatarsalRadius + metatarsalOutset, this.littleMetatarsalY, metatarsalRadius])

	return sandalSkeleton
},

getSpringPolygons: function(sandalPolygon) {
	var springPolygons = []
	var springsDifference = this.intersectionBack - this.intersectionFront
	var archTreadLength = this.wallThickness * 2.0
	var numberOfExtraSprings = Math.floor((springsDifference - this.springLength) / (this.springLength + archTreadLength))
	var springBetween = (springsDifference - numberOfExtraSprings * archTreadLength) / (numberOfExtraSprings + 1.0)
	var springWavelength = springBetween + archTreadLength
	var rectangleFront = this.intersectionFront + springBetween
	for (var rectangleIndex = 0; rectangleIndex < numberOfExtraSprings; rectangleIndex++) {
		var rectangle = getRectangleCornerParameters(this.farLeft, rectangleFront, this.doubleRight, rectangleFront + archTreadLength)
		var intersectionPolygon = Polygon.getIntersectionPolygon(sandalPolygon, rectangle)
		springPolygons.push(intersectionPolygon)
		rectangleFront += springWavelength
	}

	return springPolygons
},

getSuffixStatement: function(registry, statement, suffix) {
	var suffixStatementMap = new Map()
	if (statement.attributeMap.has('alteration')) {
		suffixStatementMap.set('alteration', statement.attributeMap.get('alteration'))
	}

	var suffixStatement = getStatementByParentTag(suffixStatementMap, 0, statement, 'mesh')
	getUniqueID(this.id + suffix, registry, suffixStatement)
	return suffixStatement
},

getToePolygon: function(sandalPolygon, smallSandalPolygon, toeSubtractionPolygon, width) {
	Polyline.addArrayByIndex(smallSandalPolygon, width, 2)
	toePolygon = Polygon.getDifferencePolygon(Polygon.getDifferencePolygon(sandalPolygon, toeSubtractionPolygon), smallSandalPolygon)
	return getFilletedPolygonByIndexes(toePolygon, this.halfTreadWidth)
},

offsetArch: function(offset, sandalPolygon, segmentBegin, segmentEnd, yBottom, yMiddle, yTop) {
	var xIntersections = []
	polygonKit.addXIntersectionsByPolygonSegment(sandalPolygon, segmentBegin, segmentEnd, xIntersections, yBottom)
	if (xIntersections.length == 0) {
		return
	}

	var bottomX = xIntersections[0]
	xIntersections.length = 0
	polygonKit.addXIntersectionsByPolygonSegment(sandalPolygon, segmentBegin, segmentEnd, xIntersections, yMiddle)
	if (xIntersections.length == 0) {
		return
	}

	polygonKit.splitPolygonBySegment(sandalPolygon, segmentBegin, segmentEnd, yTop)
	polygonKit.splitPolygonBySegmentX(sandalPolygon, segmentBegin, segmentEnd, bottomX + offset, yBottom)
	polygonKit.splitPolygonBySegmentX(sandalPolygon, segmentBegin, segmentEnd, xIntersections[0] + offset, yMiddle)
},

outsetHeelStub: function(sandalPolygon, segmentBegin, segmentEnd) {
	var xIntersections = []
	polygonKit.addXIntersectionsByPolygonSegment(sandalPolygon, segmentBegin, segmentEnd, xIntersections, this.heelStubBack)
	if (xIntersections.length > 0) {
		var outsideX = xIntersections[0]
		polygonKit.splitPolygonBySegment(sandalPolygon, segmentBegin, segmentEnd, this.heelStubBack)
		polygonKit.splitPolygonBySegmentX(sandalPolygon, segmentBegin, segmentEnd, outsideX, this.heelOutsetSplitY)
	}
},

processStatement: function(registry, statement) {
//276 x 101 bigToeRadius15 bigToeX26 healRadius35.5 littleToeRadius8 littleToeX79 metatarsalY200
//251 x 93.7
//243 x 94
	statement.tag = 'polygon'
	var points = getRectangularPoints(registry, statement, [10.0, 10.0])
	this.size = VectorFast.getSubtraction2D(points[1], points[0])
	this.right = this.size[0]
	this.top = this.size[1]
	if (this.right <= 0.0 || this.top <= 0.0) {
		printCaller(['Size not positive in sandal in generatorpoints.', this.size, statement])
		return
	}

	this.archBackThickness = getFloatByDefault('archBackThickness', registry, statement, this.tag, -1.0)
	this.archBackThicknessRatio = getFloatByDefault('archBackThicknessRatio', registry, statement, this.tag, 0.04)
	this.archBeginX = getFloatByDefault('archBeginX', registry, statement, this.tag, -1.0)
	this.archBeginXRatio = getFloatByDefault('archBeginXRatio', registry, statement, this.tag, 0.35)
	this.archCenterThickness = getFloatByDefault('archCenterThickness', registry, statement, this.tag, -1.0)
	this.archCenterThicknessRatio = getFloatByDefault('archCenterThicknessRatio', registry, statement, this.tag, 0.06)
	this.archCenterY = getFloatByDefault('archCenterY', registry, statement, this.tag, -1.0)
	this.archCenterYRatio = getFloatByDefault('archCenterYRatio', registry, statement, this.tag, 0.4)
	this.archFrontThickness = getFloatByDefault('archFrontThickness', registry, statement, this.tag, -1.0)
	this.archFrontThicknessRatio = getFloatByDefault('archFrontThicknessRatio', registry, statement, this.tag, 0.02)
	this.bigMetatarsalBaseHeight = getFloatByDefault('bigMetatarsalBaseHeight', registry, statement, this.tag, 36.0)
	this.bigMetatarsalY = getFloatByDefault('bigMetatarsalY', registry, statement, this.tag, -1.0)
	this.bigToeX = getFloatByDefault('bigToeX', registry, statement, this.tag, -1.0)
	this.bigToeXRatio = getFloatByDefault('bigToeXRatio', registry, statement, this.tag, 0.26)
	this.bigToeRadius = getFloatByDefault('bigToeRadius', registry, statement, this.tag, -1.0)
	this.bigToeRadiusRatio = getFloatByDefault('bigToeRadiusRatio', registry, statement, this.tag, 0.15)
	this.bigToeRidgeAngle = getFloatByDefault('bigToeRidgeAngle', registry, statement, this.tag, 10.0) * gRadiansPerDegree
	this.bottomBevel = getFloatByDefault('bottomBevel', registry, statement, this.tag, 12.0)
	this.claspThickness = getFloatByDefault('claspThickness', registry, statement, this.tag, 7.0)
	this.footGap = getFloatByDefault('footGap', registry, statement, this.tag, 2.0)
	this.gap = getFloatByDefault('gap', registry, statement, this.tag, 0.3)
//	this.heelBackHeight = getFloatByDefault('heelCupHeight', registry, statement, this.tag, -1.0)
//	this.heelBackHeightRatio = getFloatByDefault('heelCupHeightRatio', registry, statement, this.tag, 0.32)
//	this.heelCupAngle = getFloatByDefault('heelCupAngle', registry, statement, this.tag, 7.0) * gRadiansPerDegree
	this.heelCupHeight = getFloatByDefault('heelCupHeight', registry, statement, this.tag, -1.0)
	this.heelCupHeightRatio = getFloatByDefault('heelCupHeightRatio', registry, statement, this.tag, 0.62)
	this.heelCupHeight = Value.getValueRatio(this.heelCupHeight, this.right, this.heelCupHeightRatio)
	this.heelStrapXAngle = getFloatByDefault('heelStrapXAngle', registry, statement, this.tag, 45.0)
	this.heelWidth = getFloatByDefault('heelWidth', registry, statement, this.tag, -1.0)
	this.heelWidthRatio = getFloatByDefault('heelWidthRatio', registry, statement, this.tag, 0.63)
	this.heelWidth = Value.getValueRatio(this.heelWidth, this.right, this.heelWidthRatio)
	this.littleMetatarsalBaseHeight = getFloatByDefault('littleMetatarsalBaseHeight', registry, statement, this.tag, 26.0)
	this.littleMetatarsalY = getFloatByDefault('littleMetatarsalY', registry, statement, this.tag, -1.0)
	this.littleToeRidgeAngle = getFloatByDefault('littleToeRidgeAngle', registry, statement, this.tag, 36.0) * gRadiansPerDegree
	this.littleToeRadius = getFloatByDefault('littleToeRadius', registry, statement, this.tag, -1.0)
	this.littleToeRadiusRatio = getFloatByDefault('littleToeRadiusRatio', registry, statement, this.tag, 0.08)
	this.littleToeX = getFloatByDefault('littleToeX', registry, statement, this.tag, -1.0)
	this.littleToeXRatio = getFloatByDefault('littleToeXRatio', registry, statement, this.tag, 0.78)
	this.metatarsalWidening = getFloatByDefault('metatarsalWidening', registry, statement, this.tag, 6.0)
	this.metatarsalYRatio = getFloatByDefault('metatarsalYRatio', registry, statement, this.tag, 0.73)
	this.outset = getFloatByDefault('outset', registry, statement, this.tag, 12.0)
	var outsetFront = getFloatByDefault('outsetFront', registry, statement, this.tag, -1)
	var outsetFrontRatio = getFloatByDefault('outsetFrontRatio', registry, statement, this.tag, 0.012)
	outsetFront = Value.getValueRatio(outsetFront, this.top, outsetFrontRatio)
	this.overhangAngle = getFloatByDefault('overhangAngle', registry, statement, this.tag, 40.0) * gRadiansPerDegree
	this.paddingThickness = getFloatByDefault('paddingThickness', registry, statement, this.tag, 6.0)
	this.ribbonThickness = getFloatByDefault('ribbonThickness', registry, statement, this.tag, 0.1)
	this.ridgeCenterX = getFloatByDefault('ridgeCenterX', registry, statement, this.tag, -1.0)
	this.ridgeCenterXRatio = getFloatByDefault('ridgeCenterXRatio', registry, statement, this.tag, 0.42)
	this.ridgeCenterY = getFloatByDefault('ridgeCenterY', registry, statement, this.tag, -1.0)
	this.ridgeCenterYRatio = getFloatByDefault('ridgeCenterYRatio', registry, statement, this.tag, 0.846)
	this.ridgeThickness = getFloatByDefault('ridgeThickness', registry, statement, this.tag, 1.0)
	this.ridgeWidth = getFloatByDefault('ridgeWidth', registry, statement, this.tag, -1.0)
	this.ridgeWidthRatio = getFloatByDefault('ridgeWidthRatio', registry, statement, this.tag, 0.04)
	var sandalHeight = getFloatByDefault('sandalHeight', registry, statement, this.tag, 15.0)
	this.sides = getIntByDefault('sides', registry, statement, this.tag, viewBroker.numberOfBigSides.value)
	this.springLength = getFloatByDefault('springLength', registry, statement, this.tag, 2.0)
	this.springsFront = getFloatByDefault('springsFront', registry, statement, this.tag, -1)
	this.springsFrontRatio = getFloatByDefault('springsFrontRatio', registry, statement, this.tag, 0.45)
	this.springsFront = Value.getValueRatio(this.springsFront, this.right, this.springsFrontRatio)
	this.springThickness = getFloatByDefault('springThickness', registry, statement, this.tag, 2.0)
	this.stemExtraHeight = getFloatByDefault('stemExtraHeight', registry, statement, this.tag, 2.0)
	this.stemWidth = getFloatByDefault('stemWidth', registry, statement, this.tag, 8.0)
	this.strapXAngle = getFloatByDefault('strapXAngle', registry, statement, this.tag, 15.0)
	this.strapYAngle = getFloatByDefault('strapYAngle', registry, statement, this.tag, 25.0)
	this.strapThickness = getFloatByDefault('strapThickness', registry, statement, this.tag, 3.0)
	this.strapThicknessGap = getFloatByDefault('strapThicknessGap', registry, statement, this.tag, 0.5)
	this.strapWidth = getFloatByDefault('strapWidth', registry, statement, this.tag, 25.0)
	this.toeAngle = getFloatByDefault('toeAngle', registry, statement, this.tag, -45.0) * gRadiansPerDegree
	this.toeExtraLength = getFloatByDefault('toeExtraLength', registry, statement, this.tag, 15.0)
	this.topBevel = getFloatByDefault('topBevel', registry, statement, this.tag, 1.0)
	this.treadHeight = getFloatByDefault('treadHeight', registry, statement, this.tag, 4.5)
	this.treadWidth = getFloatByDefault('treadWidth', registry, statement, this.tag, 6.0)
	this.wallThickness = getFloatByDefault('wallThickness', registry, statement, this.tag, 4.0)

	this.claspInsideLength = this.strapWidth + this.strapThicknessGap * 2.0
	this.claspLength = this.claspInsideLength + this.strapThicknessGap * 2.0 + this.wallThickness * 2.0
	this.compressedThickness = this.paddingThickness * 0.67
	this.doubleRight = this.right * 2.0
	this.footInset = Math.max(this.footGap, this.paddingThickness)
	this.halfClaspLengthWall = this.claspLength * 0.5 + this.wallThickness * 2.0
	this.halfClaspThickness = this.claspThickness * 0.5
	this.halfWallThickness = this.wallThickness * 0.5
//	this.heelBackHeight = Value.getValueRatio(this.heelBackHeight, this.right, this.heelBackHeightRatio) + this.compressedThickness
	this.claspLengthPlus = this.claspLength + this.halfWallThickness
	this.midX = this.right * 0.5
	this.pillarFilletRadius = this.claspThickness * 0.25
	this.strapClearance = this.strapThickness + this.strapThicknessGap * 2.0

	this.sandalSkeleton = this.getSandalSkeleton(this.outset, outsetFront)
	var sandalPolygon = this.getSandalPolygon(this.outset, this.sandalSkeleton, this.toeExtraLength)
	if (sandalPolygon.length == 0) {
		printCaller(['No polygon in sandal in generatorpoints.', sandalPolygon, statement])
		return
	}

	if (sandalHeight == 0.0) {
		setPointsExcept(Polyline.add2D(around.getPolygon(sandalPolygon, this.sides), points[0]), registry, statement)
		return
	}

	var matrix3D = getChainMatrix3D(registry, statement)
	convertToGroup(statement)

	this.id = statement.attributeMap.get('id')
	var sandalMesh = this.getSandalMesh(statement.attributeMap, sandalHeight, matrix3D, sandalPolygon)
	Polyline.add2D(sandalMesh.points, points[0])

	analyzeOutputMesh(sandalMesh, registry, this.getSuffixStatement(registry, statement, '_base'))

	var bigMetatarsalClipMesh = this.getMetatarsalClipMesh
	(120.0, this.bigMetatarsalBase, this.bigMetatarsalBaseHeight, this.bigMetatarsalInner, this.bigSkew3D)
	analyzeOutputMesh(bigMetatarsalClipMesh, registry, this.getSuffixStatement(registry, statement, '_big_metatarsal_clip'))
	var littleMetatarsalClipMesh = this.getMetatarsalClipMesh
	(-120.0, this.littleMetatarsalBase, this.littleMetatarsalBaseHeight, this.littleMetatarsalInner, this.littleSkew3D)
	analyzeOutputMesh(littleMetatarsalClipMesh, registry, this.getSuffixStatement(registry, statement, '_little_metatarsal_clip'))

//	analyzeOutputMesh(this.getHeelClipMesh(matrix3D), registry, this.getSuffixStatement(registry, statement, '_heel_clip'))
	analyzeOutputMesh(this.getOuterHeelClipMesh(matrix3D), registry, this.getSuffixStatement(registry, statement, '_outer_heel_clip'))
},

tag: 'sandal'
}

var gTrapezoid = {
	getTrapezoid: function(beginX, endX, points, widening) {
		var begin = points[0]
		var end = points[1]
		var trapezoid = []
		var beginEnd = VectorFast.getSubtraction2D(end, begin)
		var beginEndLength = VectorFast.length2D(beginEnd)
		if (beginEndLength == 0.0) {
			printCaller(['Distance between begin and end is zero in getTrapezoid in generator2d.', points])
			return []
		}

		VectorFast.divide2DScalar(beginEnd, beginEndLength)
		var beginEndX = [beginEnd[1], -beginEnd[0]]
		trapezoid = [VectorFast.getAddition2D(begin, VectorFast.getMultiplication2DScalar(beginEndX, beginX[1] + widening))]
		trapezoid.push(VectorFast.getAddition2D(end, VectorFast.getMultiplication2DScalar(beginEndX, endX[1] + widening)))
		trapezoid.push(VectorFast.getAddition2D(end, VectorFast.getMultiplication2DScalar(beginEndX, endX[0] - widening)))
		trapezoid.push(VectorFast.getAddition2D(begin, VectorFast.getMultiplication2DScalar(beginEndX, beginX[0] - widening)))
		return trapezoid
	},
	processStatement: function(registry, statement) {
		statement.tag = 'polygon'
		var beginX = getFloatsIncludingZero('beginX', registry, statement, this.tag)
		var points = getRectangularPoints(registry, statement, [0.0, 10.0])
		var endX = getFloatsByDefault('endX', registry, statement, this.tag, beginX)
		addZeroToFloats(endX)
		Vector.setUndefinedElementsToArray(endX, beginX)
		statement.attributeMap.set('endX', endX.toString())
		var widening = getFloatByDefault('widening', registry, statement, this.tag, 0.0)
		var points = this.getTrapezoid(beginX, endX, points, widening)
		setPointsExcept(points, registry, statement)
	},
	tag: 'trapezoid'
}

var gTrapezoidSocket = {
	getTrapezoidSocket: function(beginX, endX, points, selfGap, stopperGap, stopperThickness, widening) {
		var begin = points[0]
		var end = points[1]
		var extraUHeight = stopperGap + stopperThickness
		var trapezoid = []
		var beginEnd = VectorFast.getSubtraction2D(end, begin)
		var beginEndLength = VectorFast.length2D(beginEnd)
		if (beginEndLength == 0.0) {
			printCaller(['Distance between begin and end is zero in getTrapezoid in generator2d.', points])
			return []
		}

		VectorFast.divide2DScalar(beginEnd, beginEndLength)
		var beginEndX = [beginEnd[1], -beginEnd[0]]
		var extraURatio = extraUHeight / beginEndLength
		var extraPoint = VectorFast.getMultiplication2DScalar(beginEnd, extraUHeight)
		endX[0] += (endX[0] - beginX[0]) * extraURatio
		endX[1] += (endX[1] - beginX[1]) * extraURatio
		VectorFast.add2D(end, extraPoint)
		trapezoid = [VectorFast.getAddition2D(begin, VectorFast.getMultiplication2DScalar(beginEndX, beginX[0] - widening))]
		trapezoid.push(VectorFast.getAddition2D(end, VectorFast.getMultiplication2DScalar(beginEndX, endX[0] - widening)))
		if (stopperThickness > 0.0) {
			var endXPlusGapMinusWidening = endX[0] + selfGap - widening
			var endXMinusGapPlusWidening = endX[1] - selfGap + widening
			trapezoid.push(VectorFast.getAddition2D(end, VectorFast.getMultiplication2DScalar(beginEndX, endXPlusGapMinusWidening)))
			var stopperEnd = VectorFast.getSubtraction2D(end, VectorFast.getMultiplication2DScalar(beginEnd, stopperThickness))
			var extraStopperRatio = stopperThickness / (beginEndLength + extraUHeight)
			var topMultiplier = endXPlusGapMinusWidening + (beginX[0] - endX[0]) * extraStopperRatio
			trapezoid.push(VectorFast.getAddition2D(stopperEnd, VectorFast.getMultiplication2DScalar(beginEndX, topMultiplier)))
			var bottomMultiplier = endXMinusGapPlusWidening + (beginX[1] - endX[1]) * extraStopperRatio
			trapezoid.push(VectorFast.getAddition2D(stopperEnd, VectorFast.getMultiplication2DScalar(beginEndX, bottomMultiplier)))
			trapezoid.push(VectorFast.getAddition2D(end, VectorFast.getMultiplication2DScalar(beginEndX, endXMinusGapPlusWidening)))
		}

		trapezoid.push(VectorFast.getAddition2D(end, VectorFast.getMultiplication2DScalar(beginEndX, endX[1] + widening)))
		trapezoid.push(VectorFast.getAddition2D(begin, VectorFast.getMultiplication2DScalar(beginEndX, beginX[1] + widening)))
		return trapezoid
	},
	processStatement: function(registry, statement) {
		statement.tag = 'polyline'
		var beginX = getFloatsIncludingZero('beginX', registry, statement, this.tag)
		var points = getRectangularPoints(registry, statement, [0.0, 10.0])
		var endX = getFloatsByDefault('endX', registry, statement, this.tag, beginX)
		addZeroToFloats(endX)
		Vector.setUndefinedElementsToArray(endX, beginX)
		statement.attributeMap.set('endX', endX.toString())
		var selfGap = getFloatByDefault('selfGap', registry, statement, this.tag, 1.4)
		var stopperGap = getFloatByDefault('stopperGap', registry, statement, this.tag, 0.0)
		var stopperThickness = getFloatByDefault('stopperThickness', registry, statement, this.tag, 0.0)
		var widening = getFloatByDefault('widening', registry, statement, this.tag, 0.0)
		var points = this.getTrapezoidSocket(beginX, endX, points, selfGap, stopperGap, stopperThickness, widening)
		setPointsExcept(points, registry, statement)
	},
	tag: 'trapezoidSocket'
}

var gGeneratorPointsProcessors = [
	gAround, gArrow, gBeltDrive, gBuckle, gCart,
	gPolygon, gPolyline, gPontoon, gRack, gRectangle, gSandal, gTrapezoid, gTrapezoidSocket]
