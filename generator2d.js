//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gMirror = {
	name: 'mirror',
	optionMap: null,
	processStatement:function(registry, statement) {
		statement.tag = 'polygon'
		var points = getPolygonPoints(statement)
		if (points == null) {
			return
		}
		var angle = getFloatByStatement('angle', registry, statement)
		var mirrorStart = points.length - 1
		var perpendicular = getFloatsByStatement('perpendicular', registry, statement)
		if (!getIsEmpty(perpendicular)) {
			if (perpendicular.length == 1) {
				perpendicular.push(0.0)
			}
		}
		var direction = null
		if (angle == null) {
			if (getIsEmpty(perpendicular)) {
				perpendicular = [0.0, 0.0]
				if (points.length > 1) {
					var penultimatePoint = points[points.length - 2]
					var ultimatePoint = points[points.length - 1]
					direction = getXYSubtraction(ultimatePoint, penultimatePoint)
					direction = [direction[1], -direction[0]]
					perpendicular = multiplyXYByScalar(getXYAddition(penultimatePoint, ultimatePoint), 0.5)
					mirrorStart -= 2
				}
			}
			if (direction == null) {
				direction = [perpendicular[1], -perpendicular[0]]
			}
			var directionLength = getXYLength(direction)
			if (directionLength == 0.0) {
				direction = [0.0, 1.0]
			}
			else {
				divideXYZByScalar(direction, directionLength)
			}
		}
		else {
			angle *= gRadiansPerDegree
			direction = [Math.sin(angle), Math.cos(angle)]
			if (getIsEmpty(perpendicular)) {
				perpendicular = [0.0, 0.0]
			}
		}
		var reverseRotation = [direction[0], -direction[1]]
		var lineRotatedY = perpendicular[0] * reverseRotation[1] + perpendicular[1] * reverseRotation[0]
		var mirrorFromY = lineRotatedY + lineRotatedY
		for (var pointIndex = mirrorStart; pointIndex > -1; pointIndex--) {
			var pointRotated = getXYRotation(points[pointIndex], reverseRotation)
			pointRotated[1] = mirrorFromY - pointRotated[1]
			points.push(getXYRotation(pointRotated, direction))
		}
		statement.attributeMap.set('points', points.join(' '))
	}
}

var gRectangle = {
	name: 'rectangle',
	optionMap: null,
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		statement.tag = 'polygon'
		var points = getPolygonPoints(statement)
		if (points == null) {
			return
		}
		if (points.length == 1) {
			points.push([0.0, 0.0])
		}
		if (points.length == 2) {
			var minimumX = Math.min(points[0][0], points[1][0])
			var minimumY = Math.min(points[0][1], points[1][1])
			var maximumX = Math.max(points[0][0], points[1][0])
			var maximumY = Math.max(points[0][1], points[1][1])
			points = [[minimumX, minimumY], [minimumX, maximumY], [maximumX, maximumY], [maximumX, minimumY]]
		}
		attributeMap.set('points', points.join(' '))
	}
}

var gVerticalHole = {
	name: 'verticalHole',
	optionMap: new Map([['capitalized', 'sagAngle']]),
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var overhangAngle = getFloatByDefault(40.0, 'overhangAngle', registry, statement, this.name) * gRadiansPerDegree
		cx = getFloatByDefault(0.0, 'cx', registry, statement, this.name)
		cy = getFloatByDefault(0.0, 'cy', registry, statement, this.name)
		radius = getFloatByDefault(1.0, 'r', registry, statement, this.name)
		sagAngle = getFloatByDefault(15.0, 'sagAngle', registry, statement, this.name) * gRadiansPerDegree
		sides = getFloatByDefault(24.0, 'sides', registry, statement, this.name)
		points = []
		beginAngle = Math.PI / 2.0 - overhangAngle
		endAngle = 1.5 * Math.PI + overhangAngle
		maximumIncrement = 2.0 * Math.PI / sides
		deltaAngle = endAngle - beginAngle
		arcSides = Math.ceil(deltaAngle / maximumIncrement - 0.001 * overhangAngle)
		angleIncrement = deltaAngle / arcSides
		halfAngleIncrement = 0.5 * angleIncrement
		beginAngle -= halfAngleIncrement
		endAngle += halfAngleIncrement + 0.001 * overhangAngle
		outerRadius = radius / Math.cos(0.5 * angleIncrement)
		for (pointAngle = beginAngle; pointAngle < endAngle; pointAngle += angleIncrement) {
			x = cx + Math.sin(pointAngle) * outerRadius
			y = cy + Math.cos(pointAngle) * outerRadius
			points.push([x, y])
		}
		topY = cy + radius
		deltaBegin = getXYSubtraction(points[0], points[1])
		sagRunOverRise = Math.cos(sagAngle) / Math.sin(sagAngle)
		segmentRunOverRise = deltaBegin[0] / deltaBegin[1]
		approachRunOverRise = sagRunOverRise - segmentRunOverRise
		topMinusSegment = topY - points[0][1]
		topX = topMinusSegment * segmentRunOverRise + points[0][0]
		aboveMinusTopY = (topX - cx) / approachRunOverRise
		sagDeltaX = aboveMinusTopY * sagRunOverRise
		aboveY = topY + aboveMinusTopY
		points[0] = [cx + sagDeltaX, aboveY]
		points[points.length - 1] = [cx - sagDeltaX, aboveY]
		for (pointIndex = 0; pointIndex < points.length; pointIndex++) {
			point = points[pointIndex]
			points[pointIndex] = [point[0].toFixed(3), point[1].toFixed(3)]
		}
		attributeMap.set('points', points.join(' '))
		statement.tag = 'polygon'
	}
}

var gGenerator2DProcessors = [gMirror, gRectangle, gVerticalHole]
