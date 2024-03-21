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
		if (radiusAngles == undefined) {
			return
		}

		centerPoint = centerPoint.slice(0, 2)
		var around = spiralCenterRadiusOnly(centerPoint, radiusAngles.radius, radiusAngles.beginAngle, radiusAngles.endAngle, sides)
		pushArray(aroundPolygon, around)
	},
	addArcs: function(aroundPolygon, maximumLengthMinus, points, sides, vertexIndex) {
		var centerPoint = points[vertexIndex]
		var radiusAngles = this.getRadiusAngles(aroundPolygon, maximumLengthMinus, points, sides, vertexIndex)
		centerPoint.push(radiusAngles)
		if (radiusAngles == undefined) {
			return
		}

		centerPoint = centerPoint.slice(0, 2)
		var around = spiralCenterRadiusOnly(centerPoint, radiusAngles.radius, radiusAngles.beginAngle, radiusAngles.endAngle, sides)
		pushArray(aroundPolygon, around)
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
		var radiusDifference = getValueDefault(otherRadius, 0.0) - centerRadius
		if (Math.abs(radiusDifference / betweenLength) < gClose) {
			return 0.0
		}

		return Math.asin(radiusDifference / betweenLength)
	},
	getPointAngle: function(along, point) {
		var radiusAngles = point[point.length - 1]
		var angle = radiusAngles.beginAngle * (1.0 - along) + radiusAngles.endAngle * along + Math.PI
		return {angle:angle, point:add2D(polarRadius(angle, -radiusAngles.radius), point)}
	},
	getPolygon: function(points, sides) {
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
		var sides = Math.max(getValueDefault(sides, 24), 3)
		for (var vertexIndex = 0; vertexIndex < points.length; vertexIndex++) {
			this.add(aroundPolygon, maximumLengthMinus, points, sides, vertexIndex)
		}

		return aroundPolygon
	},
	getPolygonArcs: function(points, sides) {
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
		var sides = Math.max(getValueDefault(sides, 24), 3)
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
		var centerBegin = getSubtraction2D(beginPoint, centerPoint)
		var centerBeginLength = length2D(centerBegin)
		if (centerBeginLength == 0.0) {
			return undefined
		}

		divide2DScalar(centerBegin, centerBeginLength)
		var endPoint = points[(vertexIndex + 1) % points.length]
		var centerEnd = getSubtraction2D(endPoint, centerPoint)
		var centerEndLength = length2D(centerEnd)
		if (centerEndLength == 0.0) {
			return undefined
		}

		divide2DScalar(centerEnd, centerEndLength)
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

		var barbEnd = getSubtraction2D(end, barb)
		var barbEndLength = length2D(barbEnd)
		if (barbEndLength == 0.0) {
			return
		}

		divide2DScalar(barbEnd, barbEndLength)
		var dotProduct = dotProduct2D(beginEnd, barbEnd)
		var angleDifference = (angleMultiplier - 1.0) * Math.acos(dotProduct) * gDegreesPerRadian
		pushArray(arrowPoints, spiralFromToAngleOnly(barb, end, angleDifference * 2.0, numberOfSides, false, false))
	},
	addTip: function(
	angleMultiplier, arrowPoints, barbSlope, beginEnd, beginEndLeft, beginEndRight, end, halfThickness, numberOfSides, tip) {
		if (tip.length <= 0.0) {
			arrowPoints.push(add2D(getMultiplication2DScalar(beginEndRight, halfThickness), end))
			arrowPoints.push(add2D(getMultiplication2DScalar(beginEndLeft, halfThickness), end))
			return
		}

		var halfHeadWidth = tip.width * 0.5
		var endStemCenter = add2D(getMultiplication2DScalar(beginEnd, -tip.length), end)
		if (tip.rightMultiplier > 0.0) {
			var endStemRight = add2D(getMultiplication2DScalar(beginEndRight, halfThickness), endStemCenter)
			arrowPoints.push(endStemRight)
			var rightExtra = halfHeadWidth * tip.rightMultiplier - halfThickness
			var barb = getMultiplication2DScalar(beginEndRight, rightExtra)
			barb = add2D(add2D(barb, endStemRight), getMultiplication2DScalar(beginEnd, rightExtra * barbSlope))
			arrowPoints.push(barb)
			this.addCurve(angleMultiplier, arrowPoints, barb, beginEnd, end, numberOfSides)
		}

		arrowPoints.push(end)
		if (tip.leftMultiplier > 0.0) {
			var endStemLeft = add2D(getMultiplication2DScalar(beginEndLeft, halfThickness), endStemCenter)
			var leftExtra = halfHeadWidth * tip.leftMultiplier - halfThickness
			var barb = getMultiplication2DScalar(beginEndLeft, leftExtra)
			barb = add2D(add2D(barb, endStemLeft), getMultiplication2DScalar(beginEnd, leftExtra * barbSlope))
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
			noticeByList(['points.length < 2 in arrow in generatorpoints.', points, statement])
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
		var beginEnd = getSubtraction2D(end, begin)
		var beginEndLength = length2D(beginEnd)
		if (beginEndLength == 0.0) {
			noticeByList(['beginEndLength == 0.0 in arrow in generatorpoints.', points, statement])
			setPointsExcept(points, registry, statement)
			return
		}

		statement.attributeMap.set('placerPoints', begin.toString() + ' ' + end.toString())
		divide2DScalar(beginEnd, beginEndLength)
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
		copyKeysExcept(pulleyMap, statement.attributeMap, gIDTransformSet)
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
				var centerEnd = getSubtraction2D(endPoint, center)
				var centerEndLength = length2D(centerEnd)
				divide2DScalar(centerEnd, centerEndLength)
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
				pushArray(rope, spiralCenterRadiusOnly(center, radius, pulleyFromAngle, pulleyToAngle, this.sides))
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
			var hole = getRegularPolygon(center, 1.0, false, this.holeRadius, 0.0, this.sides, 0.0)
			hole = getDirectedPolygon(!getIsCounterclockwise(pulleyPolygon), hole)
			pulleyPolygon = getDifferencePolygons(hole, pulleyPolygon)[0]
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
			noticeByList(['points.length < 1 in beltDrive in generatorpoints.', points, statement])
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

		deleteKeysExcept(statement.attributeMap, gIDTransformSet)
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
		var size = getSubtraction2D(topRight, bottomLeft)
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
			pushArray(bucklePoints, [[right, barbInnerY], [right + barbRight, barbOuterY], tipRight, tipLeft])
			pushArray(buckleRadiuses, [0.0, barbRadius, tipRadius, tipRadius])
		}
		else {
			pushArray(bucklePoints, [[right, barbOuterY], tipRight, tipLeft, [innerRight + barbRight, barbOuterY]])
			pushArray(buckleRadiuses, [barbRadius, tipRadius, tipRadius, barbRadius])
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
			pushArray(bucklePoints, parabola)
			var endRadiuses = new Array(parabola.length).fill(0.0)
			endRadiuses[endRadiuses.length - 1] = innerCornerRadius
			pushArray(buckleRadiuses, endRadiuses)
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
		setPointsHD(getRegularPolygon([x, this.wheelRadius], 1.0, true, radius, 0.0, this.sides, 0.0), wheelStatement)
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
		var pointsDistance = distance2D(beginPoint, endPoint)
		var left = fromOffset
		var right = pointsDistance - toOffset
		var rectangle = [[left, bottom], [right, bottom], [right, top], [left, top]]
		setPointsExcept(rectangle, registry, statement)
		var translationString = ''
		var beginEnd = getSubtraction2D(endPoint, beginPoint)
		var beginEndLength = length2D(beginEnd)
		if (beginEndLength != 0.0) {
			divide2DScalar(beginEnd, beginEndLength)
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
		copyKeysExcept(cartMap, statement.attributeMap, gIDTransformSet)
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

		removeUndefineds(statement.children)
		pushArray(statement.children, fronts)
		deleteKeysExcept(statement.attributeMap, gIDTransformSet)
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
	var secondDistanceSquared = distanceSquared2D(point, polygon[secondIndex])
	var thirdIndex = (closestIndex - 1 + polygon.length) % polygon.length
	if (distanceSquared2D(point, polygon[thirdIndex]) < secondDistanceSquared) {
		secondIndex = thirdIndex
	}

	var pointCenterAngle = Math.atan2(centerPoint[1] - point[1], centerPoint[0] - point[0])
	var endPoint = polygon[secondIndex]
	var centerEnd = getSubtraction2D(endPoint, centerPoint)
	var centerEndLength = length2D(centerEnd)
	if (centerEndLength == 0.0) {
		return {angle:pointCenterAngle, point:centerPoint}
	}

	divide2DScalar(centerEnd, centerEndLength)
	var pointEndAngle = Math.atan2(endPoint[1] - point[1], endPoint[0] - point[0])
	var reverseRotation = [centerEnd[0], -centerEnd[1]]
	var centerPointRotated = getRotation2DVector(centerPoint, reverseRotation)
	var endPointRotated = getRotation2DVector(endPoint, reverseRotation)
	var pointRotated = getRotation2DVector(point, reverseRotation)
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
	var closestPoint = getMultiplication2DScalar(centerPoint, oneMinusAlong)
	add2D(closestPoint, getMultiplication2DScalar(endPoint, along))
	return {angle:pointCenterAngle * oneMinusAlong + pointEndAngle * along, point:closestPoint}
}

function getRectangleCornerParameters(minimumX, minimumY, maximumX, maximumY) {
	return [[minimumX, minimumY], [maximumX, minimumY], [maximumX, maximumY], [minimumX, maximumY]]
}

function getRectangularPoints(registry, statement, valueDefault) {
	var points = getPointsHD(registry, statement)
	if (getIsEmpty(points)) {
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

var gPontoon = {
	addPanelStatements: function(name, polygons, registry, statement) {
		var idStartName = this.idStart + name + '_'
		addPolygonStatements('Pontoon', idStartName, polygons, registry, statement)
		if (this.xMultiplier == 0.0) {
			return
		}

		for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
			polygons[polygonIndex] = getArraysCopy(polygons[polygonIndex])
			var polygon = polygons[polygonIndex]
			polygon.reverse()
			var boundingBox = getBoundingBox(polygon)
			var x = boundingBox[0][0]
			if (this.xMultiplier < 0.0) {
				x = boundingBox[1][0]
			}
			subtract2Ds(polygon, [x, boundingBox[0][1]])
			multiplyArraysByIndex(polygon, this.xMultiplier, 0)
			swap2DPolyline(polygon)
			roundFloatArrays(polygon)
		}

		addPolygonStatements('Pontoon', idStartName + 'swapped_', polygons, registry, statement)
	},
	getDefinitions: function() {
		return [
		{text:'Corner Width', lower:1.0, decimalPlaces:1, upper:10.0, value:5.0},
		{text:'Curve Power', lower:1.0, decimalPlaces:1, upper:3.0, value:2.0},
		{text:'Pontoon Height', lower:1.0, decimalPlaces:0, upper:50.0, value:10.0},
		{text:'Tip Corner Width', lower:0.0, decimalPlaces:0, upper:20.0, value:10.0},
		{text:'Tip Length', lower:0.0, decimalPlaces:0, upper:50.0, value:20.0}]
	},
	getPanelPolygons: function(centerVector, polyline) {
		if (getIsEmpty(this.panels)) {
			return []
		}

		var panelPolygons = []
		for (var panelIndex = 1; panelIndex < this.panels.length; panelIndex++) {
			var panelPolygon = getPolylineSlice(this.panels[panelIndex - 1], this.panels[panelIndex], polyline)
			addMirrorPoints(centerVector, panelPolygon.length, panelPolygon)
			panelPolygons.push(panelPolygon)
		}

		return panelPolygons
	},
	getPontoonPolygon: function(points) {
		var halfTipCornerWidth = this.tipCornerWidth * 0.5
		var size = getSubtraction2D(points[1], points[0])
		var right = size[0]
		var top = size[1]
		var midY = top * 0.5
		var pontoonPolygon = []
		if (this.tipLength != 0.0) {
			pontoonPolygon.push([0.0, midY - halfTipCornerWidth])
		}

		pontoonPolygon.push([this.tipLength, midY - halfTipCornerWidth])
		var cornerIndexes = []
		if (!getIsEmpty(this.corners)) {
			var cornerEnd = this.corners[0]
			for (var cornerIndex = 1; cornerIndex < this.corners.length; cornerIndex++) {
				cornerEnd = Math.max(cornerEnd, this.corners[cornerIndex])
			}
			cornerEnd += this.cornerWidth * 0.5
			var distanceMultiplier = midY / Math.pow(cornerEnd - this.tipLength, this.curvePower)
			for (var corner of this.corners) {
				cornerIndexes.push(pontoonPolygon.length)
				pontoonPolygon.push([corner, distanceMultiplier * Math.pow(cornerEnd - corner, this.curvePower)])
			}
		}

		pontoonPolygon.push([right, 0.0])
		this.topInsets = []
		for (var cornerIndex of cornerIndexes) {
			var beginPoint = pontoonPolygon[cornerIndex - 1]
			var centerPoint = pontoonPolygon[cornerIndex]
			var endPoint = pontoonPolygon[cornerIndex + 1]
			var centerBegin = normalize2D(getSubtraction2D(beginPoint, centerPoint))
			var centerEnd = normalize2D(getSubtraction2D(endPoint, centerPoint))
			var beginEnd = add2D([-centerBegin[0], -centerBegin[1]], centerEnd)
			var beginEndLength = length2D(beginEnd)
			var lengthMultiplier = this.cornerWidth / beginEndLength
			this.topInsets.push(lengthMultiplier)
			var beginEndLeft = [-beginEnd[1] / beginEndLength, beginEnd[0] / beginEndLength]
			var halfDistance = distance2D(beginEndLeft, [-centerEnd[1], centerEnd[0]]) * 0.5
			var yDown = halfDistance * halfDistance
			var topDistance = Math.sqrt(halfDistance * halfDistance - yDown * yDown) / (0.5 - yDown)
			centerPoint.push(multiply2DScalar(centerBegin, lengthMultiplier))
			centerPoint.push(multiply2DScalar(centerEnd, lengthMultiplier))
			centerPoint.push(multiply2DScalar(beginEndLeft, topDistance * this.pontoonHeight))
		}

		for (var vertexIndex = pontoonPolygon.length - 1; vertexIndex > -1; vertexIndex--) {
			var endPoint = pontoonPolygon[vertexIndex]
			if (endPoint.length > 3) {
				var tinyDeltaBack = getMultiplication2DScalar(endPoint[4], 0.001)
				pontoonPolygon.splice(vertexIndex, 0, add2D(add2D(endPoint.slice(0), tinyDeltaBack), endPoint[3]))
				pontoonPolygon.splice(vertexIndex, 0, add2D(add2D(endPoint.slice(0), tinyDeltaBack), endPoint[2]))
				pontoonPolygon.splice(vertexIndex, 0, add2D(endPoint.slice(0, 2), endPoint[2]))
				add2D(endPoint, endPoint[3])
				endPoint.length = 2
			}
		}

		add2Ds(pontoonPolygon, points[0])
		if (this.tipLength != 0.0) {
			var centerPoint = pontoonPolygon[1]
			var endPoint = pontoonPolygon[2]
			var centerEnd = getSubtraction2D(endPoint, centerPoint)
			var centerEndLength = length2D(centerEnd)
			if (centerEndLength > 0.0) {
				multiply2DScalar(centerEnd, this.pontoonHeight / centerEndLength)
				var deltaX = Math.sqrt(this.pontoonHeight * this.pontoonHeight + this.tipLength * this.tipLength) + centerEnd[1]
				var y = centerPoint[1] - centerEnd[0] - deltaX * centerEnd[1] / centerEnd[0]
				pontoonPolygon[0][1] = y
			}
		}

		this.topPolygon = getArraysCopy(pontoonPolygon)
		for (var point of this.topPolygon) {
			if (point.length > 3) {
				add2D(point, point[4])
			}
			point.length = 2
		}

		setArraysLength(pontoonPolygon, 2)
		var centerVector = {center:[0.0, midY + points[0][1]], vector:[1.0, 0.0]}
		this.bottomPanelPolygons = this.getPanelPolygons(centerVector, pontoonPolygon)
		this.topPanelPolygons = this.getPanelPolygons(centerVector, pontoonPolygon)
		addMirrorPoints(centerVector, pontoonPolygon.length, pontoonPolygon)
		addMirrorPoints(centerVector, this.topPolygon.length, this.topPolygon)
		return pontoonPolygon
	},
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		statement.tag = 'polygon'
		var points = getRectangularPoints(registry, statement, [200.0, 100.0])
		this.corners = getFloatsByDefault('corners', registry, statement, statement.tag, [50.0])
		this.cornerWidth = getFloatByDefault('cornerWidth', registry, statement, this.tag, 5.0)
		this.curvePower = getFloatByDefault('curvePower', registry, statement, this.tag, 2.0)
		this.panels = getFloatsByDefault('panels', registry, statement, statement.tag, [])
		var panelWidth = getFloatByDefault('panelWidth', registry, statement, this.tag, 60.0)
		this.pontoonHeight = getFloatByDefault('pontoonHeight', registry, statement, this.tag, 10.0)
		this.tipCornerWidth = getFloatByDefault('tipCornerWidth', registry, statement, this.tag, 10.0)
		this.tipLength = getFloatByDefault('tipLength', registry, statement, this.tag, 20.0)
		this.xMultiplier = getFloatByDefault('xMultiplier', registry, statement, this.tag, 0.0)
		var bottomPolygon = this.getPontoonPolygon(points)
		setPointsExcept(bottomPolygon, registry, statement)
		removeByGeneratorName(statement.children, 'Pontoon')

		var pontoonMap = new Map()
		this.idStart = attributeMap.get('id') + '_'
		copyKeysExcept(pontoonMap, attributeMap, gIDTransformSet)
		addPolygonStatement(new Map(), 'Pontoon', this.idStart + 'bottom', bottomPolygon, registry, statement)
		convertToGroup(statement)

		addPolygonStatement(new Map(), 'Pontoon', this.idStart + 'top', this.topPolygon, registry, statement)
		this.addPanelStatements('bottomPanel', this.bottomPanelPolygons, registry, statement)
		this.addPanelStatements('topPanel', this.topPanelPolygons, registry, statement)
		if (this.tipLength > 0.0) {
			var sideInset = bottomPolygon[0][1] - bottomPolygon[1][1]
			var sideLength = Math.sqrt(this.tipLength * this.tipLength + sideInset * sideInset)
			var tipSide = [[0.0, 0.0], [0.0, getRoundedFloat(sideLength)], [this.pontoonHeight, 0.0]]
			addPolygonStatement(new Map(), 'Pontoon', this.idStart + 'tipSide', tipSide, registry, statement)
		}

		deleteKeysExcept(attributeMap, gIDTransformSet)
		var bottomPanelArea = 0.0
		for (var bottomPanelPolygon of this.bottomPanelPolygons) {
			var boundingBox = getBoundingBox(bottomPanelPolygon)
			var size = getSubtraction2D(boundingBox[1], boundingBox[0])
			bottomPanelArea += size[0] * size[1]
		}

		attributeMap.set('bottomArea', getPolygonArea(bottomPolygon).toString())
		attributeMap.set('bottomPanelArea', bottomPanelArea.toString())
		attributeMap.set('bottomPanelLength', (bottomPanelArea / panelWidth).toString())
		attributeMap.set('topInsets', this.topInsets.toString())
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

		var advance = getIsCounterclockwise(polygon) * 2 - 1
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
		pushArray(betweenVerticals, before.reverse())
		betweenVerticals.push(rightPoint)
		this.addBetweenUntil(advance, betweenVerticals, 1, rightPoint[1], polygon, rightIndex)
		return removeIdentical2DPoints(betweenVerticals)
	},
	getRackMesh: function(bottomLeft, bottomTooth, height, matrix3D, rackPolygon, topRight, topTooth) {
		var halfDowelHeight = this.dowelHeight * 0.5
		var outerRackPolygon = rackPolygon
		var countergon = getRegularPolygon([0.0, 0.0], 1.0, true, 1.0, 0.5, this.interiorSides, -0.5 * Math.PI)
		var clockgon = getArraysCopy(countergon).reverse()
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
			bottomLeft = getAddition2D(bottomLeft, [this.bottomTopBevel, this.bottomTopBevel])
			topRight = getAddition2D(topRight, [-this.bottomTopBevel, -this.bottomTopBevel])
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
				bottomPolygons.push(add2Ds(getMultiplication2DsScalar(clockgon, socketBaseRadius), center))
				socketMiddlePolygons.push(add2Ds(getMultiplication2DsScalar(clockgon, socketMiddleRadius), center))
				socketTipPolygons.push(add2Ds(getMultiplication2DsScalar(clockgon, socketTipRadius), center))
			}
			if (this.socketHeight > heightInset) {
				pushArray(middlePolygons, socketMiddlePolygons)
				pushArray(highPolygons, socketTipPolygons)
				z -= heightMinus
			}
			else {
				pushArray(middlePolygons, socketTipPolygons)
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
			var dowelBaseRadiusCountergon = getMultiplication2DsScalar(countergon, dowelBaseRadius)
			for (var centerIndex = 0; centerIndex < centers.length; centerIndex++) {
				var dowelBaseID = 'dowelBase' + centerIndex
				dowelBaseIDs.push(dowelBaseID)
				sculptureObject.polygonMap.set(dowelBaseID, getAddition2Ds(dowelBaseRadiusCountergon, centers[centerIndex]))
				sculptureObject.statementMap.set(dowelBaseID, {attributeMap:new Map([['connectionID', '']])})
			}
		}

		layers.push({ids:dowelBaseIDs, matrix3D:height, polygons:dowelBasePolygons, vertical:false})
		if (this.dowelHeight != 0.0) {
			var midHeight = this.dowelHeight - this.dowelBevel * 2.0
			var dowelMidRadius = this.dowelRadius - this.fastenerSlope * (midHeight - halfDowelHeight)
			var dowelMidRadiusCountergon = getMultiplication2DsScalar(countergon, dowelMidRadius)
			var layerHeight = height + midHeight
			var middleDowelPolygons = new Array(centers.length)
			for (var centerIndex = 0; centerIndex < centers.length; centerIndex++) {
				middleDowelPolygons[centerIndex] = getAddition2Ds(dowelMidRadiusCountergon, centers[centerIndex])
			}
			layers.push({matrix3D:layerHeight, polygons:middleDowelPolygons, vertical:false})
			if (this.dowelBevel > 0.0) {
				var dowelTipRadius = this.dowelRadius - this.fastenerSlope * halfDowelHeight - this.dowelBevel
				var dowelTipRadiusCountergon = getMultiplication2DsScalar(countergon, dowelTipRadius)
				var dowelTipPolygons = new Array(centers.length)
				for (var centerIndex = 0; centerIndex < centers.length; centerIndex++) {
					dowelTipPolygons[centerIndex] = getAddition2Ds(dowelTipRadiusCountergon, centers[centerIndex])
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
			pushArray(rackPolygon, [[rightBevel, bottom], [right, bottomPlus], [right, topMinus], [rightBevel, topMinus]])
		}
		else {
			pushArray(rackPolygon, [[right, bottom], [right, top]])
		}

		pushArray(rackPolygon, this.getTeeth(top, leftBevel, rightBevel, topTooth).reverse())
		if (this.leftRightBevel > 0.0) {
			pushArray(rackPolygon, [[leftBevel, top], [left, topMinus], [left, bottomPlus], [leftBevel, bottom]])
		}
		else {
			pushArray(rackPolygon, [[left, top], [left, bottom]])
		}

		pushArray(rackPolygon, this.getTeeth(bottom, leftBevel, rightBevel, bottomTooth))
		return rackPolygon
	},
	getTeeth: function(height, leftBevel, rightBevel, tooth) {
		if (tooth.length == 0) {
			return tooth
		}

		var endIndex = Math.ceil((rightBevel - tooth[tooth.length - 1][0]) / this.toothSeparation)
		var teeth = []
		for (var toothIndex = Math.ceil((leftBevel - tooth[0][0]) / this.toothSeparation); toothIndex < endIndex; toothIndex++) {
			var toothCopy = getArraysCopy(tooth)
			add2Ds(toothCopy, [toothIndex * this.toothSeparation, height])
			pushArray(teeth, toothCopy)
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
			pushArray(tooth, [[toothBaseLeft - this.baseBevel, 0.0], [toothBaseLeft + baseBevelSlope, doubleBaseBevel]])
		}
		else {
			tooth.push([toothBaseLeft, 0.0])
		}

		if (this.tipBevel > 0.0) {
			var lengthMinusDouble = toothHeight - doubleTipBevel
			var tipBevelSlope = this.tipBevel * this.toothSlope
			pushArray(tooth, [[toothTipLeft - tipBevelSlope, lengthMinusDouble], [toothTipLeft + this.tipBevel, toothHeight]])
			pushArray(tooth, [[toothTipRight - this.tipBevel, toothHeight], [toothTipRight + tipBevelSlope, lengthMinusDouble]])
		}
		else {
			pushArray(tooth, [[toothTipLeft, toothHeight], [toothTipRight, toothHeight]])
		}

		if (this.baseBevel > 0.0) {
			pushArray(tooth, [[toothBaseRight - baseBevelSlope, doubleBaseBevel], [toothBaseRight + this.baseBevel, 0.0]])
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
			noticeByList(['Inset tooth width is not positive in rack in generatorpoints, rack will not be made.', insetTipWidth, statement])
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
	addHeelClasp: function(id, layers, outerSign) {
		var rectangle = getRectangleCornerParameters(this.midX, this.heelStubFront, this.midX + this.right, this.heelStubBack + 1.0)
		if (outerSign < 0.0) {
			addArraysByIndex(rectangle, this.farLeft, 0)
		}

		var heelOuterBase = getIntersectionPolygons(rectangle, this.heelCupMiddle)[0]
		var closestPointIndex = getClosestPointIndex([this.doubleRight, -this.outset], heelOuterBase)
		heelOuterBase = getPolygonRotatedToIndex(heelOuterBase, closestPointIndex)
		var midpoint = getMidpoint2D(heelOuterBase[1], heelOuterBase[heelOuterBase.length - 2])
		var arc = spiralFromToAngleOnly(heelOuterBase[heelOuterBase.length - 1], heelOuterBase[0], 150, gFillet.sides, false, false)
		pushArray(heelOuterBase, arc)

		this.sculptureObject.polygonMap.set(id, heelOuterBase)
		this.sculptureObject.statementMap.set(id, {attributeMap:new Map([['connectionID', 'heelCup']])})
		layers.push({matrix3D:this.heelStubHeight, ids:[id], vertical:true})

		var scaleTranslate2D = getMatrix2DByScale([1.0, this.cosHeelStrapX])
		scaleTranslate2D = getMultiplied2DMatrix(getMatrix2DByTranslate([midpoint[0], this.heelStubFront]), scaleTranslate2D)
		var beginPillarFront = 0.02
		var endPillarFront = this.heelClaspInsideLength + this.wallThickness
		var endPillarBack = endPillarFront + this.wallThickness
		var pillarPolygons = this.getPillarPolygons(beginPillarFront, this.wallThickness, endPillarFront, endPillarBack)
		transform2DPolylines(scaleTranslate2D, pillarPolygons)
		var pillarTop = this.heelStubHeight + this.strapClearance
		layers.push({matrix3D:pillarTop, polygons:pillarPolygons, vertical:true})

		var bar = getRectangleCornerParameters(-this.halfClaspThickness, beginPillarFront, this.halfClaspThickness, endPillarBack)
		bar = getFilletedPolygonByIndexes(bar, this.halfClaspThickness, gFillet.sides)
		transform2DPoints(scaleTranslate2D, bar)
		layers.push({matrix3D:pillarTop + this.wallThickness, polygons:[bar], vertical:true})
	},
	addMetatarsalClasp: function(base, baseID, baseZ, connectionID, layers, offsetRatio, rotation3D) {
		var baseMatrix3D = getMatrix3DByTranslateZ([baseZ])
		baseMatrix3D = getMultiplied3DMatrix(rotation3D, baseMatrix3D)

		var boundingBox = getBoundingBox(base)
		var center = getMidpoint2D(boundingBox[0], boundingBox[1])
		center[0] += (boundingBox[1][0] - boundingBox[0][0] - this.stemWidth) * offsetRatio
		var stemPolygon = getRegularPolygon(center, 0.0, true, this.stemRadius, 0.0, this.sides, 0.0)

		var stemZ = baseZ + this.strapClearance
		var stemMatrix3D = getMatrix3DByTranslateZ([stemZ])
		stemMatrix3D = getMultiplied3DMatrix(rotation3D, stemMatrix3D)

		var heelClaspHalfLength = this.heelClaspInsideLength * 0.5
		var beginPillarFront = -heelClaspHalfLength - this.wallThickness
		var endPillarFront = heelClaspHalfLength
		var endPillarBack = endPillarFront + this.wallThickness
		var pillarPolygons = this.getPillarPolygons(beginPillarFront, -heelClaspHalfLength, endPillarFront, endPillarBack)
		for (var pillarPolygon of pillarPolygons) {
			add2Ds(pillarPolygon, center)
		}

		var bar = getRectangleCornerParameters(-this.halfClaspThickness, beginPillarFront, this.halfClaspThickness, endPillarBack)
		bar = getFilletedPolygonByIndexes(bar, this.halfClaspThickness, gFillet.sides)
		add2Ds(bar, center)

		var capZ = stemZ + this.wallThickness
		var capMatrix3D = getMatrix3DByTranslateZ([capZ])
		capMatrix3D = getMultiplied3DMatrix(rotation3D, capMatrix3D)

		this.sculptureObject.polygonMap.set(baseID, base)
		this.sculptureObject.statementMap.set(baseID, {attributeMap:new Map([['connectionID', connectionID]])})
		layers.push({matrix3D:baseMatrix3D, ids:[baseID], vertical:true})
		layers.push({matrix3D:stemMatrix3D, polygons:pillarPolygons, vertical:true})
		layers.push({matrix3D:capMatrix3D, polygons:[bar], vertical:true})
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
			this.rectangleDifferencePolygons.push(rectangle)
			treadFront += treadAdvance
		}
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
		addSplitPointsToPolygon(archPolygon, this.archBeginX) 
		var betweenXMap = new Map()
		var between = this.archBeginX
		var numberOfBetweens = 2
		var numberOfBetweensPlus = numberOfBetweens + 1
		betweenAdvance = (edgeX - this.archBeginX) / numberOfBetweensPlus
		for (var betweenIndex = 1; betweenIndex < numberOfBetweensPlus; betweenIndex++) {
			between += betweenAdvance
			var betweenRatio = betweenIndex / numberOfBetweensPlus
			betweenXMap.set(between, 1.0 - betweenRatio * betweenRatio)
			addSplitPointsToPolygon(archPolygon, between) 
		}

		swap2DPolyline(archPolygon)
		for (var point of archPolygon) {
			var x = point[0]
			if (betweenXMap.has(x)) {
				point[2] *= betweenXMap.get(x)
			}
			else {
				if (x > between) {
					point[2] = 0.0
				}
			}
		}

		return archPolygon
	},
/*
	getClaspMesh: function(matrix3D) {
		var stemRadiusPlus = this.stemRadius + this.gap
		var capCenterFront = this.wallThickness + stemRadiusPlus
		var capCenterBack = capCenterFront + this.capWidening * 2.0
		var capLowerCenter = [0.0, capCenterFront, stemRadiusPlus]
		var halfClearancePlus = this.strapThickness * 0.5 + this.strapThicknessGap
		var strapSlotY = capCenterBack + stemRadiusPlus + this.wallThickness + halfClearancePlus
		var strapSlotHalfX = this.strapWidth * 0.5 + halfClearancePlus
		var strapLeftCenter = [-strapSlotHalfX, strapSlotY, halfClearancePlus]
		var strapRightCenter = [strapSlotHalfX, strapSlotY]
		var capSlot = around.getPolygon([capLowerCenter, [0.0, capCenterBack]])
		capSlot.reverse()
		var strapSlot = around.getPolygon([strapLeftCenter, strapRightCenter])
		strapSlot.reverse()
		capLowerCenter[2] += this.wallThickness
		strapLeftCenter[2] += this.wallThickness
		strapRightCenter[2] += this.wallThickness
		var outerPolygon = around.getPolygon([capLowerCenter, strapRightCenter, strapLeftCenter])
		var layers = [{polygons:[outerPolygon, capSlot, strapSlot]}]
		layers.push({matrix3D:this.claspThickness, polygons:[outerPolygon, capSlot, strapSlot]})
		return sculpture.getMesh(layers, matrix3D)
	},
*/
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
	getHeelPoints: function(bigMetatarsalY, littleMetatarsalY, outset) {
		var heelBig = [this.bigMetatarsalRadius - this.midX, this.bigMetatarsalY - this.heelRadius]
		var heelBigLength = length2D(heelBig)
		if (heelBigLength == 0.0) {
			return
		}

		multiply2DScalar(heelBig, this.heelRadius / heelBigLength)
		heelBig = [-heelBig[1], heelBig[0]]
		rotate2DVector(heelBig, polarCounterclockwise(around.getExtraAngle(heelBigLength, this.heelRadius, this.bigMetatarsalRadius)))
		var bigIntersection = add2D([this.midX, this.heelRadius], heelBig)
		var bigIntersectionX = bigIntersection[0] + bigIntersection[1] * heelBig[1] / heelBig[0]
		var heelLittle = [this.right - this.littleMetatarsalRadius - this.midX, this.littleMetatarsalY - this.heelRadius]
		var heelLittleLength = length2D(heelLittle)
		if (heelLittleLength == 0.0) {
			return
		}

		multiply2DScalar(heelLittle, this.heelRadius / heelLittleLength)
		heelLittle = [heelLittle[1], -heelLittle[0]]
		rotate2DVector(heelLittle, polarCounterclockwise(around.getExtraAngle(heelLittleLength, this.littleMetatarsalRadius, this.heelRadius)))
		var littleIntersection = add2D([this.midX, this.heelRadius], heelLittle)
		var littleIntersectionX = littleIntersection[0] + littleIntersection[1] * heelLittle[1] / heelLittle[0]
		var halfHeelRadius = this.heelRadius * 0.5

		var bigHeelPoint = [(bigIntersectionX + this.midX) * 0.5, halfHeelRadius, halfHeelRadius + outset]
		var littleHeelPoint = [(littleIntersectionX + this.midX) * 0.5, halfHeelRadius]
		return [bigHeelPoint, littleHeelPoint]
	},
	getPillarPolygons: function(beginPillarFront, beginPillarBack, endPillarFront, endPillarBack) {
		var pillarPolygons = []
		var pillar = getRectangleCornerParameters(-this.halfClaspThickness, beginPillarFront, this.halfClaspThickness, beginPillarBack)
		pillar = getFilletedPolygonByIndexes(pillar, this.halfClaspThickness, gFillet.sides)
		pillarPolygons.push(pillar)
		var pillar = getRectangleCornerParameters(-this.halfClaspThickness, endPillarFront, this.halfClaspThickness, endPillarBack)
		pillar = getFilletedPolygonByIndexes(pillar, this.halfClaspThickness, gFillet.sides)
		pillarPolygons.push(pillar)
		return pillarPolygons
	},
	getRectangleCouple: function(endHalfLength, endHalfWidth, middleHalfLength, middleHalfWidth) {
		var rectangleCouple = [[-middleHalfLength, -middleHalfWidth], [, -endHalfWidth], [-endHalfLength, undefined]]
		setUndefinedArraysToPrevious(rectangleCouple)
		var center = [0.0, 0.0]
		addMirrorPoints({center:center, vector:[1.0, 0.0]}, rectangleCouple.length, rectangleCouple)
		addMirrorPoints({center:center, vector:[0.0, 1.0]}, rectangleCouple.length, rectangleCouple)
		return rectangleCouple
	},
	getRidgeBase: function(halfRidgeWidth) {
		var ridgeLeft = [this.bigMetatarsalMidX, this.ridgeCenterY - this.bigRidgeDown]
		var ridgeCenter = [this.ridgeCenterX, this.ridgeCenterY]
		var ridgeRight = [this.littleMetatarsalMidX, this.ridgeCenterY - this.littleRidgeDown]
		var ridgeline = [ridgeLeft, ridgeCenter, ridgeRight]
		var ridge = getOutlinesQuickly(undefined, undefined, undefined, [[halfRidgeWidth, halfRidgeWidth]], [ridgeline], undefined)[0]
		swap2DPolyline(ridge)
		var bigSplitPolygons = []
		addSplitPolygonByHeight(ridge, this.bigMetatarsalMidX, bigSplitPolygons)
		var littleSplitPolygons = []
		addSplitPolygonByHeight(bigSplitPolygons[1], this.littleMetatarsalMidX, littleSplitPolygons)
		ridge = littleSplitPolygons[0]
		swap2DPolyline(ridge)
		return getUnionPolygonsByPolygons([ridge, this.bigMetatarsalBase, this.littleMetatarsalBase])
	},
	getSandalMesh: function(attributeMap, height, matrix3D, sandalPolygon, size) {
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

		this.capBetweenZ = this.capWidening * Math.tan(0.5 * Math.PI - this.overhangAngle * 0.9)
		var doubleBevel = this.bottomBevel * 2.0
		this.doubleRight = this.right * 2.0
		this.farLeft = -this.right
		this.stemRadius = this.stemWidth * 0.5
		this.halfWallThickness = this.wallThickness * 0.5

		var bigMetatarsalRadiusPlus = this.bigMetatarsalRadius * 1.1
		var bigMetatarsalBaseFront = this.bigMetatarsalY - bigMetatarsalRadiusPlus
		var bigMetatarsalBaseBack = this.bigMetatarsalY + bigMetatarsalRadiusPlus
		leftPolygon.reverse()
		leftPolygon = getPolygonRotatedToLower(leftPolygon, 1)
		var leftPolyline = getPolylineSlice(bigMetatarsalBaseFront, bigMetatarsalBaseBack, leftPolygon, 1)
		leftPolyline.reverse()
		var leftPolylineZeroX = leftPolyline[0][0]
		var leftPolylineLastX = leftPolyline[leftPolyline.length - 1][0]
		this.bigMetatarsalBase = [[(leftPolylineLastX - this.metatarsalGap) * 0.5, bigMetatarsalBaseFront]]
		this.bigMetatarsalBase.push([-this.metatarsalGap, bigMetatarsalBaseFront * 0.8 + bigMetatarsalBaseBack * 0.2])
		this.bigMetatarsalBase.push([-this.metatarsalGap, bigMetatarsalBaseFront * 0.15 + bigMetatarsalBaseBack * 0.85])
		this.bigMetatarsalMidX = (leftPolylineZeroX - this.metatarsalGap) * 0.5
		this.bigMetatarsalBase.push([this.bigMetatarsalMidX, bigMetatarsalBaseBack])
		pushArray(this.bigMetatarsalBase, leftPolyline)
		var bigFilletRadius = (-this.metatarsalGap - leftPolylineZeroX) * 0.4
		this.bigMetatarsalBase = getFilletedPolygonByIndexes(this.bigMetatarsalBase, bigFilletRadius, gFillet.sides)
		var bigMetatarsalZ = height + this.bigMetatarsalBaseHeight
		var leftRotation3D = getMatrix3DRotateY([this.strapYAngle, -this.metatarsalGap, 0.0, bigMetatarsalZ])
		var bigRotation3D = getMatrix3DRotateX([-this.strapXAngle, 0.0, this.bigMetatarsalY, bigMetatarsalZ])
		bigRotation3D = getMultiplied3DMatrix(bigRotation3D, leftRotation3D)

		var halfLittleBaseLength = this.littleMetatarsalRadius * 0.3 + this.bigMetatarsalRadius * 0.7
		var littleMetatarsalBaseFront = this.littleMetatarsalY - halfLittleBaseLength
		var littleMetatarsalBaseBack = this.littleMetatarsalY + halfLittleBaseLength
		rightPolygon = getPolygonRotatedToLower(rightPolygon, 1)
		var rightPolyline = getPolylineSlice(littleMetatarsalBaseFront, littleMetatarsalBaseBack, rightPolygon, 1)
		var rightPolylineZeroX = rightPolyline[0][0]
		var rightPolylineLastX = rightPolyline[rightPolyline.length - 1][0]
		var littleMetatarsalBaseX = this.right + this.metatarsalGap
		this.littleMetatarsalMidX = (rightPolylineLastX + littleMetatarsalBaseX) * 0.5
		this.littleMetatarsalBase = [[this.littleMetatarsalMidX, littleMetatarsalBaseBack]]
		this.littleMetatarsalBase.push([littleMetatarsalBaseX, littleMetatarsalBaseFront * 0.15 + littleMetatarsalBaseBack * 0.85])
		this.littleMetatarsalBase.push([littleMetatarsalBaseX, littleMetatarsalBaseFront * 0.8 + littleMetatarsalBaseBack * 0.2])
		this.littleMetatarsalBase.push([(rightPolylineZeroX + littleMetatarsalBaseX) * 0.5, littleMetatarsalBaseFront])
		pushArray(this.littleMetatarsalBase, rightPolyline)
		var littleFilletRadius = (rightPolylineLastX - littleMetatarsalBaseX) * 0.4
		this.littleMetatarsalBase = getFilletedPolygonByIndexes(this.littleMetatarsalBase, littleFilletRadius, gFillet.sides)

		var littleMetatarsalZ = height + this.littleMetatarsalBaseHeight
		var rightRotation3D = getMatrix3DRotateY([-this.strapYAngle, littleMetatarsalBaseX, 0.0, littleMetatarsalZ])
		var littleRotation3D = getMatrix3DRotateX([-this.strapXAngle, 0.0, this.littleMetatarsalY, littleMetatarsalZ])
		littleRotation3D = getMultiplied3DMatrix(littleRotation3D, rightRotation3D)

		this.halfRidgeWidth = 0.5 * getValueRatio(this.ridgeWidth, this.top, this.ridgeWidthRatio)
		this.ridgeCenterX = getValueRatio(this.ridgeCenterX, this.right, this.ridgeCenterXRatio)
		this.ridgeCenterY = getValueRatio(this.ridgeCenterY, this.top, this.ridgeCenterYRatio)
		this.bigRidgeDown = (this.ridgeCenterX - this.bigMetatarsalMidX) * Math.tan(this.bigToeRidgeAngle)
		this.littleRidgeDown = (this.littleMetatarsalMidX - this.ridgeCenterX) * Math.tan(this.littleToeRidgeAngle)

		this.heelRadiusPlus = this.heelRadius + this.heelGap
		var heelCutout = [[this.midX, this.heelRadiusPlus, this.heelRadiusPlus]]
		heelCutout.push([this.littleMetatarsalX, this.littleMetatarsalY, this.littleMetatarsalRadius])
		heelCutout.push([this.bigMetatarsalX, this.bigMetatarsalY, this.bigMetatarsalRadius])
		heelCutout = around.getPolygon(heelCutout, this.sides)
		var springsFront = this.heelRadius * 1.5
		this.heelFilletRadius = this.right * 0.05
		var heelCupHeight = getValueRatio(this.heelCupHeight, this.right, this.heelCupHeightRatio)
		this.heelCupTop = height + heelCupHeight

		var splitPolygons = []
		addSplitPolygonByHeight(sandalPolygon, springsFront, splitPolygons)
		this.heelCup = getDifferencePolygons(heelCutout, splitPolygons[0])[0]
		this.heelCup = getFilletedPolygonByIndexes(this.heelCup, this.heelFilletRadius, gFillet.sides)

		var heelCornerThickness = heelCupHeight * 0.45
		var heelCornerHeight = height + heelCornerThickness
		splitPolygons = []
		var wideSandal = this.getHeelPoints(this.bigMetatarsalY, this.littleMetatarsalY, this.outset)
		wideSandal.push(this.littleMetatarsalPoint.slice(0, 3))
		wideSandal.push(this.bigMetatarsalPoint.slice(0, 3))
		wideSandal = around.getPolygonArcs(wideSandal, this.sides / 3.0)
		this.heelStubBack = springsFront + heelCornerThickness * Math.tan(this.overhangAngle)
		addSplitPolygonByHeight(wideSandal, this.heelStubBack, splitPolygons)
		this.heelCupMiddle = getDifferencePolygons(heelCutout, splitPolygons[0])[0]
		this.heelCupMiddle = getFilletedPolygonByIndexes(this.heelCupMiddle, this.heelFilletRadius * 2.0, gFillet.sides)

		var heelClaspGap = 1.0
		this.heelClaspInsideLength = this.strapWidth + this.strapThicknessGap * 2.0
		this.heelClaspLength = heelClaspGap + this.heelClaspInsideLength + this.wallThickness * 2.0
		var sinHeelStrapX = Math.sin(this.heelStrapXAngle * gRadiansPerDegree)
		this.heelStubHeight = heelCornerHeight + heelCupHeight * 0.1 + this.heelClaspLength * sinHeelStrapX
		this.cosHeelStrapX = Math.cos(this.heelStrapXAngle * gRadiansPerDegree)
		this.heelStubFront = this.heelStubBack - this.heelClaspLength * this.cosHeelStrapX
		var heelSplitY = this.heelStubFront - 1.0
		addSplitPointsToPolygon(this.heelCupMiddle, heelSplitY)
		this.heelCupBevelLower = getArraysCopy(this.heelCupMiddle)
		this.heelCupBevelUpper = getArraysCopy(this.heelCupMiddle)
		var bevelLower = -this.topBevel * Math.tan(Math.PI / 6.0)
		var bevelUpper = bevelLower - this.topBevel * Math.tan(Math.PI / 3.0)
		var outsetLower = [bevelLower, bevelLower]
		var outsetUpper = [bevelUpper, bevelUpper]
		for (var vertexIndex = 0; vertexIndex < this.heelCupMiddle.length; vertexIndex++) {
			if (this.heelCupMiddle[vertexIndex][1] < heelSplitY) {
				this.heelCupBevelLower[vertexIndex] = getOutsetPoint(outsetLower, this.heelCupMiddle, vertexIndex)
				this.heelCupBevelUpper[vertexIndex] = getOutsetPoint(outsetUpper, this.heelCupMiddle, vertexIndex)
			}
		}

		var springBottom = height - this.springThickness
		var springsBack = Math.min(bigMetatarsalBaseFront, littleMetatarsalBaseFront)
		this.intersectionBack = springsBack - this.halfWallThickness
		this.intersectionFront = springsFront + this.halfWallThickness
		var springsDifference = this.intersectionBack - this.intersectionFront
		var numberOfExtraSprings = Math.floor((springsDifference - this.springWidth) / (this.springWidth + this.wallThickness))
		var rectangle = getRectangleCornerParameters(this.farLeft, this.intersectionFront, this.doubleRight, this.intersectionBack)
		var springPolygons = getDifferencePolygons(rectangle, sandalPolygon)
		var springBetween = (springsDifference - numberOfExtraSprings * this.wallThickness) / (numberOfExtraSprings + 1.0)
		var springWavelength = springBetween + this.wallThickness
		var rectangleFront = this.intersectionFront + springBetween
		this.archBackThickness = getValueRatio(this.archBackThickness, this.right, this.archBackThicknessRatio)
		this.archCenterThickness = getValueRatio(this.archCenterThickness, this.right, this.archCenterThicknessRatio)
		this.archFrontThickness = getValueRatio(this.archFrontThickness, this.right, this.archFrontThicknessRatio)
		this.archBeginX = getValueRatio(this.archBeginX, this.right, this.archBeginXRatio)
		this.archCenterY = getValueRatio(this.archCenterY, this.top, this.archCenterYRatio)
		for (var rectangleIndex = 0; rectangleIndex < numberOfExtraSprings; rectangleIndex++) {
			var rectangle = getRectangleCornerParameters(this.farLeft, rectangleFront, this.doubleRight, rectangleFront + this.wallThickness)
			var intersectionPolygon = getIntersectionPolygons(rectangle, sandalPolygon)[0]
			springPolygons.push(intersectionPolygon)
			rectangleFront += springWavelength
		}

		var doubleInsetTreadPolygons = []
		var insetTreadPolygons = []
		var curvedDifferencePolygons = []
		this.rectangleDifferencePolygons = []
		var tanBevel = Math.tan(this.overhangAngle) * this.bottomBevel
		var tanBevelTread = tanBevel + this.treadHeight
		var treadBevelRectangleSize = [tanBevelTread * 2.0, this.treadWidth]
		var treadRectangleSize = [this.treadHeight * 2.0, this.treadWidth]
		var doubleTreadHeight = this.treadHeight * 2.0
		var doubleTanBevelTread = tanBevelTread * 2.0
		if (this.treadHeight < springBottom - gClose) {
			var halfTreadWidth = this.treadWidth * 0.5
			var outsets = [[halfTreadWidth, halfTreadWidth]]
			var angleWidening = Math.PI * 0.05
			var halfPI = Math.PI * 0.5

			var littlePointAngle = around.getPointAngle(0.0, this.heelPoints[1])
			var littlePoint = littlePointAngle.point
			var bigPointAngle = around.getPointAngle(1.0, this.heelPoints[0])
			var bigPoint = bigPointAngle.point
			var littleFromAngle = littlePointAngle.angle - angleWidening
			var bigToAngle = bigPointAngle.angle + angleWidening
			var heelULower = getArcFromAngleToAngle(littlePoint, littleFromAngle, bigPoint, bigToAngle, this.sides)
			addEndRectangles(doubleInsetTreadPolygons, heelULower, treadBevelRectangleSize)
			addEndRectangles(insetTreadPolygons, heelULower, treadRectangleSize)
			var heelULowers = getOutlinesQuickly(undefined, undefined, undefined, outsets, [heelULower], undefined)
			pushArray(curvedDifferencePolygons, heelULowers)

			var angleWideningMore = Math.PI * 0.06
			var littlePointAngle = around.getPointAngle(0.7, this.heelPoints[1])
			var littlePoint = littlePointAngle.point
			var bigPointAngle = around.getPointAngle(0.3, this.heelPoints[0])
			var bigPoint = bigPointAngle.point
			var littleFromAngle = littlePointAngle.angle - angleWideningMore
			var bigToAngle = bigPointAngle.angle + angleWideningMore
			var heelUUpper = getArcFromAngleToAngle(littlePoint, littleFromAngle, bigPoint, bigToAngle, this.sides)
			addEndRectangles(doubleInsetTreadPolygons, heelUUpper, treadBevelRectangleSize)
			addEndRectangles(insetTreadPolygons, heelUUpper, treadRectangleSize)
			var heelUUppers = getOutlinesQuickly(undefined, undefined, undefined, outsets, [heelUUpper], undefined)
			pushArray(curvedDifferencePolygons, heelUUppers)

			var littlePointAngle = around.getPointAngle(0.5, this.littleToePoint)
			var littlePoint = littlePointAngle.point
			var bigEnd = around.getPointAngle(1.0, this.bigToePoint).point
			var metatarsalBegin = around.getPointAngle(0.0, this.bigMetatarsalPoint).point
			var metatarsalBig = getSubtraction2D(bigEnd, metatarsalBegin)
			var littleFromAngle = littlePointAngle.angle
			var littleToPoint = getAlongFromTo2D(0.6, metatarsalBegin, bigEnd)
			var littleToAngle = Math.atan2(metatarsalBig[1], metatarsalBig[0]) - halfPI - angleWidening
			var toeULower = getArcFromAngleToAngle(littlePoint, littleFromAngle, littleToPoint, littleToAngle, this.sides)
			addEndRectangles(doubleInsetTreadPolygons, toeULower, treadBevelRectangleSize)
			addEndRectangles(insetTreadPolygons, toeULower, treadRectangleSize)
			var toeULowers = getOutlinesQuickly(undefined, undefined, undefined, outsets, [toeULower], undefined)
			pushArray(curvedDifferencePolygons, toeULowers)

			var bigPointAngle = around.getPointAngle(0.65, this.bigToePoint)
			var bigPoint = bigPointAngle.point
			var littleEnd = around.getPointAngle(1.0, this.littleToePoint).point
			var bigBegin = around.getPointAngle(0.0, this.bigToePoint).point
			var littleBig = getSubtraction2D(bigBegin, littleEnd)
			var bigFromPoint = getAlongFromTo2D(0.3, littleEnd, bigBegin)
			var bigFromAngle = Math.atan2(littleBig[1], littleBig[0]) + halfPI
			var bigToAngle = bigPointAngle.angle - Math.PI * 0.1
			var toeUMiddle = getArcFromAngleToAngle(bigFromPoint, bigFromAngle, bigPoint, bigToAngle, this.sides)
			addEndRectangles(doubleInsetTreadPolygons, toeUMiddle, treadBevelRectangleSize)
			addEndRectangles(insetTreadPolygons, toeUMiddle, treadRectangleSize)
			var toeUMiddles = getOutlinesQuickly(undefined, undefined, undefined, outsets, [toeUMiddle], undefined)
			pushArray(curvedDifferencePolygons, toeUMiddles)

			var bigPointAngle = around.getPointAngle(0.2, this.bigToePoint)
			var bigPoint = bigPointAngle.point
			var littleEnd = around.getPointAngle(1.0, this.littleToePoint).point
			var bigBegin = around.getPointAngle(0.0, this.bigToePoint).point
			var littleBig = getSubtraction2D(bigBegin, littleEnd)
			var bigFromPoint = getAlongFromTo2D(0.6, littleEnd, bigBegin)
			var bigFromAngle = Math.atan2(littleBig[1], littleBig[0]) + halfPI + angleWidening
			var bigToAngle = bigPointAngle.angle - angleWidening
			var toeUUpper = getArcFromAngleToAngle(bigFromPoint, bigFromAngle, bigPointAngle.point, bigToAngle, this.sides)
			addEndRectangles(doubleInsetTreadPolygons, toeUUpper, treadBevelRectangleSize)
			addEndRectangles(insetTreadPolygons, toeUUpper, treadRectangleSize)
			var toeUUppers = getOutlinesQuickly(undefined, undefined, undefined, outsets, [toeUUpper], undefined)
			pushArray(curvedDifferencePolygons, toeUUppers)

			this.addTreads(springsBack + this.halfWallThickness, getBoundingSegment(toeULowers[0], 1)[0] - this.treadWidth)
			this.addTreads(getBoundingSegment(heelUUppers[0], 1)[1] + this.treadWidth, springsFront - this.halfWallThickness)
		}

		var treadDifferencePolygons = this.rectangleDifferencePolygons.concat(curvedDifferencePolygons)
		var insetSandalPolygon = getOutsetPolygon(getFilledArray(-tanBevel), sandalPolygon)

		this.bottomCornerPolygons = getDifferencePolygonsByPolygons(treadDifferencePolygons, springPolygons)

		var bottomBottomPolygons = []
		for (var bottomCornerPolygon of this.bottomCornerPolygons) {
			pushArray(bottomBottomPolygons, getIntersectionPolygons(bottomCornerPolygon, insetSandalPolygon))
		}

		var rectangle = getRectangleCornerParameters(this.farLeft, springsFront + doubleBevel, this.doubleRight, springsBack - doubleBevel)
		var heelToePolygons = getDifferencePolygons(rectangle, sandalPolygon)
		var doubleInsetHeelToePolygons = getOutsetPolygons(getFilledArray(-tanBevelTread), heelToePolygons)
		pushArray(doubleInsetTreadPolygons, getDifferencePolygonsByPolygons(doubleInsetHeelToePolygons, this.rectangleDifferencePolygons))
		var insetHeelToePolygons = getOutsetPolygons(getFilledArray(-this.treadHeight), heelToePolygons)
		pushArray(insetTreadPolygons, getDifferencePolygonsByPolygons(insetHeelToePolygons, this.rectangleDifferencePolygons))
		var insetPolygons = springPolygons.slice(0)
		var layers = [{polygons:bottomBottomPolygons}]
		if (this.treadHeight < springBottom - gClose) {
			layers.push({matrix3D:this.bottomBevel, polygons:this.bottomCornerPolygons, vertical:false})
			layers.push({matrix3D:this.treadHeight, polygons:this.bottomCornerPolygons, vertical:true})
			var doubleInsetPolygons = getDifferencePolygonsByPolygons(doubleInsetTreadPolygons, springPolygons)
			layers.push({matrix3D:this.treadHeight, polygons:doubleInsetPolygons, vertical:true})
			insetPolygons = getDifferencePolygonsByPolygons(insetTreadPolygons, insetPolygons)
			var treadHeightPlus = this.treadHeight + this.bottomBevel
			layers.push({matrix3D:treadHeightPlus, polygons:insetPolygons, vertical:false})
		}

		layers.push({matrix3D:height - this.springThickness, polygons:insetPolygons, vertical:true})

		this.sculptureObject = {polygonMap:new Map([['soleTop', sandalPolygon]]), statementMap:new Map()}
		layers.push({matrix3D:height, ids:['soleTop'], vertical:true})

		var ridgeSections = []
		var numberOfSides = 3
		var angle = Math.PI * 0.25
		var angleDifference = (Math.PI * 0.5 - angle) / (numberOfSides - 0.5)
		for (var sideCount = 0; sideCount < numberOfSides; sideCount++) {
			ridgeSections.push(polarCounterclockwise(angle))
			angle += angleDifference
		}

		var ridgeSectionZero = ridgeSections[0]
		var ridgeSectionLast = ridgeSections[ridgeSections.length - 1]
		addArraysByIndex(ridgeSections, -ridgeSectionZero[1], 1)
		var ridgeMultiplier = [this.halfRidgeWidth / ridgeSectionZero[0], this.ridgeThickness / ridgeSectionLast[1]]
		multiply2Ds(ridgeSections, ridgeMultiplier)
		layers.push({matrix3D:height, polygons:this.getRidgeBase(ridgeSectionZero[0]), vertical:true})
		for (var sideCount = 1; sideCount < numberOfSides - 1; sideCount++) {
			var ridgeSection = ridgeSections[sideCount]
			layers.push({matrix3D:height + ridgeSection[1], polygons:this.getRidgeBase(ridgeSection[0]), vertical:false})
		}

		this.sculptureObject.polygonMap.set('ridgeBase', this.getRidgeBase(ridgeSectionLast[0])[0])
		layers.push({matrix3D:height + ridgeSectionLast[1], ids:['ridgeBase'], vertical:false})

		for (var archPolygonIndex = 2; archPolygonIndex < springPolygons.length; archPolygonIndex++) {
			var archPolygonID = 'archPolygon' + archPolygonIndex
			var springPolygon = springPolygons[archPolygonIndex]
			var archPolygon = this.getArchPolygon(springPolygon)
			this.sculptureObject.polygonMap.set(archPolygonID, archPolygon)
			this.sculptureObject.statementMap.set(archPolygonID, {attributeMap:new Map([['connectionID', 'soleTop']])})
			layers.push({matrix3D:height, ids:[archPolygonID], vertical:true})

			var archTopPolygon = this.getArchPolygon(getOutsetPolygon([-this.topBevel, -this.topBevel], springPolygon))
			addArraysByIndex(archTopPolygon, this.topBevel, 2)
			layers.push({matrix3D:height, polygons:[archTopPolygon], vertical:false})
		}

		this.addMetatarsalClasp(this.bigMetatarsalBase, 'bigMetatarsal', bigMetatarsalZ, 'ridgeBase', layers, -0.25, bigRotation3D)
		this.addMetatarsalClasp(this.littleMetatarsalBase, 'littleMetatarsal', littleMetatarsalZ, 'ridgeBase', layers, 0.25, littleRotation3D)

		this.sculptureObject.polygonMap.set('heelCupBottom', this.heelCup)
		this.sculptureObject.statementMap.set('heelCupBottom', {attributeMap:new Map([['connectionID', 'soleTop']])})
		layers.push({matrix3D:height, ids:['heelCupBottom'], vertical:true})
		layers.push({matrix3D:heelCornerHeight, polygons:[this.heelCupMiddle], vertical:false})
		layers.push({matrix3D:this.heelCupTop - this.topBevel * 2.0, polygons:[this.heelCupMiddle], vertical:false})
		layers.push({matrix3D:this.heelCupTop - this.topBevel, polygons:[this.heelCupBevelLower], vertical:false})
		this.sculptureObject.polygonMap.set('heelCup', this.heelCupBevelUpper)
		layers.push({matrix3D:this.heelCupTop, ids:['heelCup'], vertical:false})

		this.addHeelClasp('heelInnerBase', layers, -1.0)
		this.addHeelClasp('heelOuterBase', layers, 1.0)

		var sandalMesh = polygonateMesh(sculpture.getMesh(layers, matrix3D, undefined, this.sculptureObject))
		var rotationXMatrix = getMatrix3DRotateX([90.0])
		splitMesh(undefined, this.id, rotationXMatrix, sandalMesh, undefined, undefined, [this.heelStubFront], undefined)

		var pointIndexSet = new Set()
		var rectangle = getRectangleCornerParameters(this.farLeft, this.heelStubFront, this.doubleRight, this.heelStubBack + 1.0)
		addPolygonsToPointIndexSet(pointIndexSet, sandalMesh.points, [rectangle], [[this.heelStubHeight - 1]])
		var translationPoint = [0.0, -this.heelStubFront, -this.heelStubHeight]
		var translationMatrix3D = getMatrix3DByTranslate(translationPoint)
		var negativeTranslationMatrix3D = getMatrix3DByTranslate(multiply3DScalar(translationPoint, -1.0))
		var scaleRotation3D = getMultiplied3DMatrix(getMatrix3DByScaleY([1.0 / this.cosHeelStrapX]), translationMatrix3D)
		scaleRotation3D = getMultiplied3DMatrix(getMatrix3DRotateX([-this.heelStrapXAngle]), scaleRotation3D)
		scaleRotation3D = getMultiplied3DMatrix(negativeTranslationMatrix3D, scaleRotation3D)
		transform3DPointsBySet(scaleRotation3D, pointIndexSet, sandalMesh.points)

		pointIndexSet = new Set()
		rectangle = getRectangleCornerParameters(this.farLeft, this.heelStubFront - this.outset, this.doubleRight, this.heelStubFront)
		addPolygonsToPointIndexSet(pointIndexSet, sandalMesh.points, [rectangle], [[this.heelStubHeight - 1]])
		var rotation3D = getMultiplied3DMatrix(getMatrix3DRotateX([15.0]), translationMatrix3D)
		rotation3D = getMultiplied3DMatrix(negativeTranslationMatrix3D, rotation3D)
		transform3DPointsBySet(rotation3D, pointIndexSet, sandalMesh.points)
		return polygonateMesh(sandalMesh)
	},
	getSandalPolygon: function(outset, size) {
		this.right = size[0]
		this.top = size[1]
		this.midX = this.right * 0.5
		var sandalPolygon = []
		var bigToeRadius = getValueRatio(this.bigToeRadius, this.right, this.bigToeRadiusRatio)
		var bigToeX = getValueRatio(this.bigToeX, this.right, this.bigToeXRatio)
		var littleToeRadius = getValueRatio(this.littleToeRadius, this.right, this.littleToeRadiusRatio)
		var littleToeX = getValueRatio(this.littleToeX, this.right, this.littleToeXRatio)
		var bigToeExtraOutset = outset * (this.bigMetatarsalBaseHeight / this.littleMetatarsalBaseHeight - 1.0)

		var bigToeY = this.top - bigToeRadius
		var bigToe = [bigToeX, bigToeY]
		this.heelRadius = getValueRatio(this.heelWidth, this.right, this.heelWidthRatio) * 0.5
		if (this.bigMetatarsalY < 0.0) {
			this.bigMetatarsalY = this.metatarsalYRatio * (bigToeY - this.heelRadius) + this.heelRadius
		}

		var littleToe = add2D(polarRadius(this.toeAngle + Math.PI * 0.5, bigToeRadius), bigToe)
		littleToe[1] += (littleToeX - littleToe[0]) * Math.sin(this.toeAngle) - littleToeRadius / Math.cos(this.toeAngle)
		if (this.littleMetatarsalY < 0.0) {
			this.littleMetatarsalY = this.metatarsalYRatio * (littleToe[1] - this.heelRadius) + this.heelRadius
		}

		this.littleMetatarsalRadius = littleToeRadius * 2.0
		this.bigMetatarsalRadius = bigToeRadius * 2.0

		this.heelPoints = this.getHeelPoints(this.bigMetatarsalY, this.littleMetatarsalY, outset)
		pushArray(sandalPolygon, this.heelPoints)

		this.littleMetatarsalX = this.right - this.littleMetatarsalRadius + this.metatarsalWidening
		this.littleMetatarsalPoint = [this.littleMetatarsalX, this.littleMetatarsalY, this.littleMetatarsalRadius + outset]
		sandalPolygon.push(this.littleMetatarsalPoint)

		this.littleToePoint = [littleToeX, littleToe[1], littleToeRadius + outset]
		sandalPolygon.push(this.littleToePoint)

		this.bigToePoint = [bigToeX, bigToeY, bigToeRadius + outset]
		sandalPolygon.push(this.bigToePoint)

		this.bigMetatarsalX = this.bigMetatarsalRadius - this.metatarsalWidening
		this.bigMetatarsalPoint = [this.bigMetatarsalX, this.bigMetatarsalY, this.bigMetatarsalRadius + outset + bigToeExtraOutset]
		sandalPolygon.push(this.bigMetatarsalPoint)

		return around.getPolygonArcs(sandalPolygon, this.sides / 3.0)
	},
	processStatement: function(registry, statement) {
//276 x 101 bigToeRadius15 bigToeX26 healRadius35.5 littleToeRadius8 littleToeX79 metatarsalY200
//251 x 93.7
//243 x 94
		statement.tag = 'polygon'
		var points = getRectangularPoints(registry, statement, [10.0, 10.0])
		this.archBackThickness = getFloatByDefault('archBackThickness', registry, statement, this.tag, -1.0)
		this.archBackThicknessRatio = getFloatByDefault('archBackThicknessRatio', registry, statement, this.tag, 0.04)
		this.archBeginX = getFloatByDefault('archBeginX', registry, statement, this.tag, -1.0)
		this.archBeginXRatio = getFloatByDefault('archBeginXRatio', registry, statement, this.tag, 0.35)
		this.bottomBevel = getFloatByDefault('bottomBevel', registry, statement, this.tag, 3.0)
		this.archCenterThickness = getFloatByDefault('archCenterThickness', registry, statement, this.tag, -1.0)
		this.archCenterThicknessRatio = getFloatByDefault('archCenterThicknessRatio', registry, statement, this.tag, 0.06)
		this.archCenterY = getFloatByDefault('archCenterY', registry, statement, this.tag, -1.0)
		this.archCenterYRatio = getFloatByDefault('archCenterYRatio', registry, statement, this.tag, 0.4)
		this.archFrontThickness = getFloatByDefault('archFrontThickness', registry, statement, this.tag, -1.0)
		this.archFrontThicknessRatio = getFloatByDefault('archFrontThicknessRatio', registry, statement, this.tag, 0.02)
		this.bigMetatarsalBaseHeight = getFloatByDefault('bigMetatarsalBaseHeight', registry, statement, this.tag, 30.0)
		this.bigMetatarsalY = getFloatByDefault('bigMetatarsalY', registry, statement, this.tag, -1.0)
		this.bigToeX = getFloatByDefault('bigToeX', registry, statement, this.tag, -1.0)
		this.bigToeXRatio = getFloatByDefault('bigToeXRatio', registry, statement, this.tag, 0.26)
		this.bigToeRadius = getFloatByDefault('bigToeRadius', registry, statement, this.tag, -1.0)
		this.bigToeRadiusRatio = getFloatByDefault('bigToeRadiusRatio', registry, statement, this.tag, 0.15)
		this.bigToeRidgeAngle = getFloatByDefault('bigToeRidgeAngle', registry, statement, this.tag, 10.0) * gRadiansPerDegree
		this.capHeight = getFloatByDefault('capHeight', registry, statement, this.tag, 2.0)
		this.capWidening = getFloatByDefault('capWidening', registry, statement, this.tag, 2.0)
		this.claspThickness = getFloatByDefault('claspThickness', registry, statement, this.tag, 3.0)
		this.gap = getFloatByDefault('gap', registry, statement, this.tag, 0.3)
		this.heelCupHeight = getFloatByDefault('heelCupHeight', registry, statement, this.tag, -1.0)
		this.heelCupHeightRatio = getFloatByDefault('heelCupHeightRatio', registry, statement, this.tag, 0.4)
		this.heelGap = getFloatByDefault('heelGap', registry, statement, this.tag, 2.0)
		this.heelStemBaseHeight = getFloatByDefault('heelStemBaseHeight', registry, statement, this.tag, 2.0)
		this.heelStrapXAngle = getFloatByDefault('heelStrapXAngle', registry, statement, this.tag, 45.0)
		this.heelWidth = getFloatByDefault('heelWidth', registry, statement, this.tag, -1.0)
		this.heelWidthRatio = getFloatByDefault('heelWidthRatio', registry, statement, this.tag, 0.7)
		this.littleMetatarsalBaseHeight = getFloatByDefault('littleMetatarsalBaseHeight', registry, statement, this.tag, 20.0)
		this.littleMetatarsalY = getFloatByDefault('littleMetatarsalY', registry, statement, this.tag, -1.0)
		this.littleToeRidgeAngle = getFloatByDefault('littleToeRidgeAngle', registry, statement, this.tag, 36.0) * gRadiansPerDegree
		this.littleToeRadius = getFloatByDefault('littleToeRadius', registry, statement, this.tag, -1.0)
		this.littleToeRadiusRatio = getFloatByDefault('littleToeRadiusRatio', registry, statement, this.tag, 0.08)
		this.littleToeX = getFloatByDefault('littleToeX', registry, statement, this.tag, -1.0)
		this.littleToeXRatio = getFloatByDefault('littleToeXRatio', registry, statement, this.tag, 0.78)
		this.metatarsalGap = getFloatByDefault('metatarsalGap', registry, statement, this.tag, 2.0)
		this.metatarsalWidening = getFloatByDefault('metatarsalWidening', registry, statement, this.tag, 2.0)
		this.metatarsalYRatio = getFloatByDefault('metatarsalYRatio', registry, statement, this.tag, 0.73)
		this.outset = getFloatByDefault('outset', registry, statement, this.tag, 12.0)
		this.overhangAngle = getFloatByDefault('overhangAngle', registry, statement, this.tag, 40.0) * gRadiansPerDegree
		this.ridgeCenterX = getFloatByDefault('ridgeCenterX', registry, statement, this.tag, -1.0)
		this.ridgeCenterXRatio = getFloatByDefault('ridgeCenterXRatio', registry, statement, this.tag, 0.42)
		this.ridgeCenterY = getFloatByDefault('ridgeCenterY', registry, statement, this.tag, -1.0)
		this.ridgeCenterYRatio = getFloatByDefault('ridgeCenterYRatio', registry, statement, this.tag, 0.846)
		this.ridgeThickness = getFloatByDefault('ridgeThickness', registry, statement, this.tag, 2.0)
		this.ridgeWidth = getFloatByDefault('ridgeWidth', registry, statement, this.tag, -1.0)
		this.ridgeWidthRatio = getFloatByDefault('ridgeWidthRatio', registry, statement, this.tag, 0.04)
		var sandalHeight = getFloatByDefault('sandalHeight', registry, statement, this.tag, 0.0)
		this.sides = getIntByDefault('sides', registry, statement, this.tag, viewBroker.numberOfBigSides.value)
		this.springThickness = getFloatByDefault('springThickness', registry, statement, this.tag, 1.2)
		this.springWidth = getFloatByDefault('springWidth', registry, statement, this.tag, 5.0)
		this.stemExtraHeight = getFloatByDefault('stemExtraHeight', registry, statement, this.tag, 2.0)
		this.stemWidth = getFloatByDefault('stemWidth', registry, statement, this.tag, 8.0)
		this.strapXAngle = getFloatByDefault('strapXAngle', registry, statement, this.tag, 15.0)
		this.strapYAngle = getFloatByDefault('strapYAngle', registry, statement, this.tag, 25.0)
		this.strapThickness = getFloatByDefault('strapThickness', registry, statement, this.tag, 2.5)
		this.strapThicknessGap = getFloatByDefault('strapThicknessGap', registry, statement, this.tag, 0.5)
		this.strapWidth = getFloatByDefault('strapWidth', registry, statement, this.tag, 25.0)
		this.toeAngle = getFloatByDefault('toeAngle', registry, statement, this.tag, -45.0) * gRadiansPerDegree
		this.topBevel = getFloatByDefault('topBevel', registry, statement, this.tag, 1.0)
		this.treadHeight = getFloatByDefault('treadHeight', registry, statement, this.tag, 4.5)
		this.treadWidth = getFloatByDefault('treadWidth', registry, statement, this.tag, 6.0)
		this.wallThickness = getFloatByDefault('wallThickness', registry, statement, this.tag, 4.0)
		this.halfClaspThickness = this.claspThickness * 0.5
		var size = getSubtraction2D(points[1], points[0])
		this.strapClearance = this.strapThickness + this.strapThicknessGap * 2.0
		if (this.right <= 0.0 || this.top <= 0.0) {
			noticeByList(['Size not positive in sandal in generatorpoints.', sandalPolygon, statement])
			return
		}

		var sandalPolygon = this.getSandalPolygon(this.outset, size)
		if (sandalPolygon.length == 0) {
			noticeByList(['No polygon in sandal in generatorpoints.', sandalPolygon, statement])
			return
		}

		if (sandalHeight == 0.0) {
			setPointsExcept(add2Ds(around.getPolygon(sandalPolygon, this.sides), points[0]), registry, statement)
			return
		}

		var matrix3D = getChainMatrix3D(registry, statement)
		convertToGroup(statement)
		this.id = statement.attributeMap.get('id')
		var sandalMesh = this.getSandalMesh(statement.attributeMap, sandalHeight, matrix3D, sandalPolygon, size)
		add2Ds(sandalMesh.points, points[0])
		analyzeOutputMesh(sandalMesh, registry, statement)
//		var claspMap = new Map()
	//	if (statement.attributeMap.has('alteration')) {
//			claspMap.set('alteration', statement.attributeMap.get('alteration'))
//		}

//		var claspStatement = getStatementByParentTag(claspMap, 0, statement, 'mesh')
//		getUniqueID(this.id + '_clasp', registry, claspStatement)
//		analyzeOutputMesh(this.getClaspMesh(matrix3D), registry, claspStatement)
	},
	tag: 'sandal'
}

var gTrapezoid = {
	getTrapezoid: function(beginX, endX, points, widening) {
		var begin = points[0]
		var end = points[1]
		var trapezoid = []
		var beginEnd = getSubtraction2D(end, begin)
		var beginEndLength = length2D(beginEnd)
		if (beginEndLength == 0.0) {
			noticeByList(['Distance between begin and end is zero in getTrapezoid in generator2d.', points])
			return []
		}

		divide2DScalar(beginEnd, beginEndLength)
		var beginEndX = [beginEnd[1], -beginEnd[0]]
		trapezoid = [getAddition2D(begin, getMultiplication2DScalar(beginEndX, beginX[1] + widening))]
		trapezoid.push(getAddition2D(end, getMultiplication2DScalar(beginEndX, endX[1] + widening)))
		trapezoid.push(getAddition2D(end, getMultiplication2DScalar(beginEndX, endX[0] - widening)))
		trapezoid.push(getAddition2D(begin, getMultiplication2DScalar(beginEndX, beginX[0] - widening)))
		return trapezoid
	},
	processStatement: function(registry, statement) {
		statement.tag = 'polygon'
		var beginX = getFloatsIncludingZero('beginX', registry, statement, this.tag)
		var points = getRectangularPoints(registry, statement, [0.0, 10.0])
		var endX = getFloatsByDefault('endX', registry, statement, this.tag, beginX)
		addZeroToFloats(endX)
		setUndefinedElementsToArray(endX, beginX)
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
		var beginEnd = getSubtraction2D(end, begin)
		var beginEndLength = length2D(beginEnd)
		if (beginEndLength == 0.0) {
			noticeByList(['Distance between begin and end is zero in getTrapezoid in generator2d.', points])
			return []
		}

		divide2DScalar(beginEnd, beginEndLength)
		var beginEndX = [beginEnd[1], -beginEnd[0]]
		var extraURatio = extraUHeight / beginEndLength
		var extraPoint = getMultiplication2DScalar(beginEnd, extraUHeight)
		endX[0] += (endX[0] - beginX[0]) * extraURatio
		endX[1] += (endX[1] - beginX[1]) * extraURatio
		add2D(end, extraPoint)
		trapezoid = [getAddition2D(begin, getMultiplication2DScalar(beginEndX, beginX[0] - widening))]
		trapezoid.push(getAddition2D(end, getMultiplication2DScalar(beginEndX, endX[0] - widening)))
		if (stopperThickness > 0.0) {
			var endXPlusGapMinusWidening = endX[0] + selfGap - widening
			var endXMinusGapPlusWidening = endX[1] - selfGap + widening
			trapezoid.push(getAddition2D(end, getMultiplication2DScalar(beginEndX, endXPlusGapMinusWidening)))
			var stopperEnd = getSubtraction2D(end, getMultiplication2DScalar(beginEnd, stopperThickness))
			var extraStopperRatio = stopperThickness / (beginEndLength + extraUHeight)
			var topMultiplier = endXPlusGapMinusWidening + (beginX[0] - endX[0]) * extraStopperRatio
			trapezoid.push(getAddition2D(stopperEnd, getMultiplication2DScalar(beginEndX, topMultiplier)))
			var bottomMultiplier = endXMinusGapPlusWidening + (beginX[1] - endX[1]) * extraStopperRatio
			trapezoid.push(getAddition2D(stopperEnd, getMultiplication2DScalar(beginEndX, bottomMultiplier)))
			trapezoid.push(getAddition2D(end, getMultiplication2DScalar(beginEndX, endXMinusGapPlusWidening)))
		}

		trapezoid.push(getAddition2D(end, getMultiplication2DScalar(beginEndX, endX[1] + widening)))
		trapezoid.push(getAddition2D(begin, getMultiplication2DScalar(beginEndX, beginX[1] + widening)))
		return trapezoid
	},
	processStatement: function(registry, statement) {
		statement.tag = 'polyline'
		var beginX = getFloatsIncludingZero('beginX', registry, statement, this.tag)
		var points = getRectangularPoints(registry, statement, [0.0, 10.0])
		var endX = getFloatsByDefault('endX', registry, statement, this.tag, beginX)
		addZeroToFloats(endX)
		setUndefinedElementsToArray(endX, beginX)
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
