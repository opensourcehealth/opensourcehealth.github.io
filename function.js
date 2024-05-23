//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gByID = 'attributeByIDKey floatByIDKey pointsByID rightByID setAttributesArraysByID setAttributeByID setAttributesTableByID topByID'
const gByIDNames = gByID.split(' ')
var gPolylineDefinitionsMap = undefined

function additionInterpolation(x, polyline, arrayLength) {
	var interpolationAlong = getFlatInterpolationAlongBeginEnd(x, polyline)
	var along = interpolationAlong[0]
	var oneMinus = 1.0 - along
	var lower = interpolationAlong[1]
	var upper = interpolationAlong[2]
	var minimumLength = Math.min(lower.length, upper.length)
	var point = new Array(arrayLength).fill(0.0)
	for (var dimensionIndex = 1; dimensionIndex < minimumLength; dimensionIndex++) {
		point[dimensionIndex % arrayLength] = oneMinus * lower[dimensionIndex] + along * upper[dimensionIndex]
	}
	return point
}

function additionInterpolation2D(x, polyline) {
	return additionInterpolation(x, polyline, 2)
}

function additionInterpolation3D(x, polyline) {
	return additionInterpolation(x, polyline, 3)
}

function alongsFromToDistance(from = [0.0, 0.0], to = [10.0, 0.0], fromDistances = [], toDistances = []) {
console.log('deprecated')
	fromDistances = arrayKit.getArrayByValue(fromDistances)
	toDistances = arrayKit.getArrayByValue(toDistances)
	var alongs = new Array(fromDistances.length + toDistances.length)
	from = arrayKit.getArrayByValue(from)
	to = arrayKit.getArrayByValue(to)
	var oneOverDistance = 1.0 / Vector.distanceArray(from, to)
	var arrayIndex = 0
	for (var fromIndex = 0; fromIndex < fromDistances.length; fromIndex++) {
		alongs[arrayIndex++] = oneOverDistance * fromDistances[fromIndex]
	}

	for (var toIndex = 0; toIndex < toDistances.length; toIndex++) {
		alongs[arrayIndex++] = 1.0 + oneOverDistance * toDistances[toIndex]
	}

	return alongs
}

function arcBeforeFromTo(
registry, statement, beforeX, beforeY, fromX, fromY, toX, toY, numberOfSides, includeBefore, includeFrom, includeTo) {
	return spiralBeforeFromTo(
	registry, statement, [beforeX, beforeY], [fromX, fromY], [toX, toY], numberOfSides, includeBefore, includeFrom, includeTo)
}

function arcCenterRadius(centerX, centerY, radius, fromAngle, toAngle, numberOfSides, includeFrom, includeTo) {
	return spiralCenterRadius([centerX, centerY], radius, fromAngle, toAngle, numberOfSides, undefined, includeFrom, includeTo)
}

function arcFromToAngle(registry, statement, fromX, fromY, toX, toY, angle, numberOfSides, includeFrom, includeTo) {
	return spiralFromToAngle(registry, statement, [fromX, fromY], [toX, toY], angle, numberOfSides, includeFrom, includeTo)
}

function arcFromToRadius(registry, statement, fromX, fromY, toX, toY, radius, counterclockwise, numberOfSides, includeFrom, includeTo) {
	return spiralFromToRadius(
	registry, statement, [fromX, fromY], [toX, toY], radius, counterclockwise, numberOfSides, includeFrom, includeTo)
}

function arcTo(registry, statement, toX, toY, numberOfSides, includeTo) {
	return spiralBeforeFromTo(
	registry, statement, [undefined, undefined], [undefined, undefined], [toX, toY], numberOfSides, false, false, includeTo)
}

function arcToAngle(registry, statement, toX, toY, angle, numberOfSides, includeTo) {
	return spiralFromToAngle(registry, statement, [undefined, undefined], [toX, toY], angle, numberOfSides, false, includeTo)
}

function arcToRadius(registry, statement, toX, toY, radius, counterclockwise, numberOfSides, includeTo) {
	return spiralFromToRadius(
	registry, statement, [undefined, undefined], [toX, toY], radius, counterclockwise, numberOfSides, false, includeTo)
}

function arcWaveXFromToHeight(xs, from, to, height, phase) {
console.log('deprecated')
	var from = Value.getValueDefault(from, 0.0)
	var to = Value.getValueDefault(to, 4.0)
	var xs = Value.getValueDefault(xs, intervalsFromToIncrement(from, to, 0.5))
	var arcs = new Array(xs.length)
	for (var xIndex = 0; xIndex < xs.length; xIndex++) {
		arcs[xIndex] = [xs[xIndex], arcYXFromToHeight(xs[xIndex], from, to, height, phase)]
	}

	return arcs
}

function arcYXFromToHeight(x, from, to, height, phase) {
console.log('deprecated')
	var x = Value.getValueDefault(x, 0.0)
	var from = Value.getValueDefault(from, 0.0)
	var to = Value.getValueDefault(to, 4.0)
	var height = Value.getValueDefault(height, 1.0)
	var phase = Value.getValueDefault(phase, 0.0)
	var wavelength = to - from
	var chordLength = 0.5 * wavelength
	var radius = 0.5 * height + 0.125 * chordLength * chordLength / height
	var wavePortion = getPositiveModulo(phase / 360.0 + (x -from) / wavelength)
	var y = radius - height
	if (wavePortion < 0.5) {
		var absoluteAway = (wavePortion - 0.25) * wavelength
		var squareMultiplier = radius * radius - absoluteAway * absoluteAway
		if (squareMultiplier > 0.0) {
			return Math.sqrt(squareMultiplier) - y
		}
	}
	else {
		var absoluteAway = (wavePortion - 0.75) * wavelength
		var squareMultiplier = radius * radius - absoluteAway * absoluteAway
		if (squareMultiplier > 0.0) {
			return y - Math.sqrt(squareMultiplier)
		}
	}
	return 0.0
}

function attributeByIDKey(registry, statement, id, key) {
console.log('deprecated')
	return getStatementByID(registry, statement, id).attributeMap.get(key)
}

function border(registry, statement) {
console.log('deprecated')
	return 10.0
}

function bracket(center = 0.0, side = 1.0) {
console.log('deprecated')
	return [center - side, center + side]
}

function createPolylineDefinitionsMap() {
	if (gPolylineDefinitionsMap != undefined) {
		return
	}

	const along = {text:'Along', lower:0.1, decimalPlaces:1, upper:0.9, value:0.5}
	const alongs = undefined
	const angle = {text:'Angle', value:180.0}
	const before = {text:'Before', point:[0.0, -10.0]}
	const beforeX = {text:'Before X', value:0.0}
	const beforeY = {text:'Before Y', value:0.0}
	const cellHeight = {text:'Cell Height', lower:1, upper:20, value:10.0}
	const cellWidth = {text:'Cell Width', lower:1, upper:20, value:10.0}
	const center = viewBroker.center
	const centerX = {text:'Center X', value:0.0}
	const centerY = {text:'Center Y', value:0.0}
	const counterclockwise = {text:'Counterclockwise', checked:true}
	const direction = viewBroker.direction
	const distance = {text:'Distance', lower:0.1, decimalPlaces:1, upper:15, value:1.0}
	const from = {text:'From', lower:-10.0, upper:10.0, value:0.0}
	const fromAngle = {text:'From Angle', value:0.0}
	const fromLevel = {text:'From Level', checked:true}
	const fromPoint = {text:'From', point:[0.0, 0.0]}
	const fromX = {text:'From X', value:0.0}
	const fromY = {text:'From Y', value:0.0}
	const height = {text:'Height', lower:0.1, decimalPlaces:1, upper:15, value:1.0}
	const height4 = {text:'Height', lower:1.0, upper:50.0, value:1.0}
	const horizontal = {text:'Horizontal', checked:true}
	const includeBefore = {text:'Include Before', checked:true}
	const includeFrom = {text:'Include From', checked:true}
	const includeTo = {text:'Include To', checked:true}
	const increments = {text:'Increments', lower:1, upper:20, value:2}
	const numberOfCycles = {text:'Cycles', lower:1, upper:20, value:1}
	const numberOfSegments = {text:'Segments', lower:2, upper:20, value:4}
	const numberOfSides = viewBroker.numberOfSides
	const numberOfXCells = {text:'X Cells', lower:1, upper:20, value:2}
	const numberOfYCells = {text:'Y Cells', lower:1, upper:20, value:2}
	const overhangAngle = {text:'Overhang Angle', lower:1.0, upper:60.0, value:45.0}
	const phase = {text:'Phase', lower:-180.0, upper:180.0, value:0.0}
	const polygon = undefined
	const quantity = {text:'Quantity', lower:2, upper:20, value:11}
	const radius = {text:'Radius', lower:0.1, decimalPlaces:1, upper:15, value:1.0}
	const to = {text:'To', lower:-10.0, upper:10.0, value:4.0}
	const toTen = {text:'To', lower:-10.0, upper:10.0, value:10.0}
	const toAngle = {text:'To Angle', value:180.0}
	const toPoint = {text:'To', point:[10.0, 0.0]}
	const toX = {text:'To X', value:0.0}
	const toY = {text:'To Y', value:0.0}
	const toZ = {text:'To Z', value:0.0}
	const x = {text:'X', value:0.0}
	const xs = undefined
	const y = {text:'Y', value:0.0}

	gPolylineDefinitionsMap = new Map()
	gPolylineDefinitionsMap.set('Polyline.arcBeforeFromTo',
	[beforeX, beforeY, fromX, fromY, toX, toY, numberOfSides, includeBefore, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Polyline.arcCenterRadius', [centerX, centerY, radius, fromAngle, toAngle, numberOfSides, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Polyline.arcFromToAngle', [fromX, fromY, toX, toY, angle, numberOfSides, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Polyline.arcFromToRadius',
	[fromX, fromY, toX, toY, radius, counterclockwise, numberOfSides, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Polyline.arcTo', [toX, toY, numberOfSides, includeTo])
	gPolylineDefinitionsMap.set('Polyline.arcToAngle', [toX, toY, angle, numberOfSides, includeTo])
	gPolylineDefinitionsMap.set('Polyline.arcToRadius', [toX, toY, radius, counterclockwise, numberOfSides, includeTo])
	gPolylineDefinitionsMap.set('Polyline.arcWaveXFromToHeight', [xs, from, to, height, phase])
	gPolylineDefinitionsMap.set('Polyline.arcYXFromToHeight', [x, from, to, height, phase])
	gPolylineDefinitionsMap.set('Polygon.ellipseFromToRadius', [x, fromPoint, toPoint, radius, numberOfSides, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Polygon.ellipseToRadius', [x, toPoint, radius, numberOfSides, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Polyline.insetsHeightAngle', [height4, overhangAngle, numberOfSegments])
	gPolylineDefinitionsMap.set('Vector.intervalFromToBetween', [from, toTen, along])
	gPolylineDefinitionsMap.set('Vector.intervalsFromQuantityIncrement', [from, quantity, increments, includeFrom])
	gPolylineDefinitionsMap.set('Vector.intervalsFromToAlong', [from, toTen, alongs, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Vector.intervalsFromToBetween', [from, toTen, alongs])
	gPolylineDefinitionsMap.set('Vector.intervalsFromToIncrement', [from, toTen, increments, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Vector.intervalsFromToQuantity', [from, toTen, quantity, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Polyline.lattice2D', [numberOfXCells, numberOfYCells, cellWidth, cellHeight])
	gPolylineDefinitionsMap.set('Polyline.latticePolygon', [polygon, cellWidth, cellHeight])
	gPolylineDefinitionsMap.set('Polyline.mirror', [center, direction])
//	gPolylineDefinitionsMap.set('mirrorJoin', [center, direction])
	gPolylineDefinitionsMap.set('Polyline.parabolaFromToQuantity',
	[fromPoint, toPoint, quantity, fromLevel, horizontal, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Polyline.parabolaToQuantity', [toPoint, quantity, fromLevel, horizontal, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Polyline.sineYXFromToCycles', [x, from, to, numberOfCycles, phase])
	gPolylineDefinitionsMap.set('Polyline.spiralBeforeFromTo',
	[before, fromPoint, toPoint, numberOfSides, includeBefore, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Polyline.spiralCenterRadius',
	[center, radius, fromAngle, toAngle, numberOfSides, toZ, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Polyline.spiralFromToAngle', [fromPoint, toPoint, angle, numberOfSides, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Polyline.spiralFromToRadius',
	[fromPoint, toPoint, radius, counterclockwise, numberOfSides, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Polyline.spiralTo', [toPoint, numberOfSides, includeTo])
	gPolylineDefinitionsMap.set('Polyline.spiralToAngle', [toPoint, angle, numberOfSides, includeTo])
	gPolylineDefinitionsMap.set('Polyline.spiralToRadius', [toPoint, radius, counterclockwise, numberOfSides, includeTo])
	gPolylineDefinitionsMap.set('Polyline.stepFromToBetween', [fromPoint, toPoint, along])
	gPolylineDefinitionsMap.set('Polyline.stepFromToDistance', [fromPoint, toPoint, distance])
	gPolylineDefinitionsMap.set('Polyline.stepsFromQuantityIncrement', [fromPoint, quantity, increments, includeFrom])
	gPolylineDefinitionsMap.set('Polyline.stepsFromToAlong', [fromPoint, toPoint, alongs, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Polyline.stepsFromToBetween', [fromPoint, toPoint, alongs])
	gPolylineDefinitionsMap.set('Polyline.stepsFromToQuantity', [fromPoint, toPoint, quantity, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('Polyline.stepsQuantityIncrement', [quantity, increments])
	gPolylineDefinitionsMap.set('Polyline.stepsToQuantity', [toPoint, quantity, includeTo])
	gPolylineDefinitionsMap.set('Polyline.stepToBetween', [toPoint, along])
}

var Dimension = {
border: function(registry, statement) {
	return 10.0
},

modifyObject_Private: function() {
	Dimension.border.optionMap = gMapR
	Dimension.rightByID.optionMap = gMapRS
	Dimension.topByID.optionMap = gMapRS
},

rightByID: function(registry, statement, id) {
	var boundingBox = getGroupBoundingBoxByArguments(id, registry, statement)
	if (boundingBox.length == 0) {
		return 0.0
	}

	return boundingBox[1][0]
},

topByID: function(registry, statement, id) {
	var boundingBox = getGroupBoundingBoxByArguments(id, registry, statement)
	if (boundingBox.length == 0) {
		return 0.0
	}

	return boundingBox[1][1]
}
}

function ellipseFromToRadius(registry, statement, fromPoint, toPoint, radius, numberOfSides, includeFrom, includeTo) {
console.log('deprecated')
	toPoint = arrayKit.getArrayByValue(Value.getValueDefault(toPoint, 10.0))
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	arrayKit.setUndefinedElementsToValue(toPoint, 0.0)
	var center = getMidpoint2D(fromPoint, toPoint)
	var centerFrom = Vector.getSubtraction2D(fromPoint, center)
	var centerFromLength = Vector.length2D(centerFrom)
	var numberOfSides = Value.getValueDefault(numberOfSides, 24)
	var radius = Value.getValueDefault(radius, 1.0)
	includeFrom = Value.getValueTrue(includeFrom)
	includeTo = Value.getValueTrue(includeTo)
	var arc = []
	if (includeFrom) {
		arc.push(fromPoint)
	}

	if (centerFromLength == 0.0) {
		return removeUnincluded(arc, includeFrom, includeTo)
	}

	var right = Vector.divide2DScalar([centerFrom[1], -centerFrom[0]], centerFromLength * Math.sqrt(centerFromLength))
	var numberOfArcSides = Math.ceil(numberOfSides * 0.5 - gClose)
	var zAddition = undefined
	if (fromPoint.length > 2) {
		zAddition = (toPoint[2] - fromPoint[2]) / numberOfArcSides
		center.push(0.0)
		centerFrom.push(fromPoint[2])
	}

	var rotator = Vector.polarCounterclockwise(Math.PI / numberOfArcSides)
	arc.length = numberOfArcSides
	for (var vertexIndex = 1; vertexIndex < numberOfArcSides; vertexIndex++) {
		Vector.rotate2DVector(centerFrom, rotator)
		if (zAddition != undefined) {
			centerFrom[2] += zAddition
		}
		var point = Vector.getAdditionArray(center, centerFrom, 3)
		Vector.add2D(point, Vector.getMultiplication2DScalar(right, Vector.dotProduct2D(right, centerFrom) * (radius - centerFromLength)))
		arc[vertexIndex] = point
	}

	if (includeTo) {
		arc.push(toPoint)
	}

	return removeUnincluded(arc, includeFrom, includeTo)
}

function ellipseToRadius(registry, statement, toPoint, radius, numberOfSides, includeFrom, includeTo) {
	return ellipseFromToRadius(registry, statement, [undefined, undefined], toPoint, radius, numberOfSides, false, includeTo)
}

function floatByIDKey(registry, statement, id, key) {
console.log('deprecated')
	var statement = getStatementByID(registry, statement, id)
	return getFloatByStatementValue(key, registry, statement, statement.attributeMap.get(key))
}

function getSpreadsheetTable(registry, spreadsheetID, tableID) {
	if (registry.spreadsheetMap == undefined) {
		return undefined
	}

	if (!registry.spreadsheetMap.has(spreadsheetID)) {
		return undefined
	}

	if (registry.spreadsheetTableMapMap == undefined) {
		registry.spreadsheetTableMapMap = new Map()
	}

	var spreadsheetTableMap = undefined
	if (registry.spreadsheetTableMapMap.has(spreadsheetID)) {
		spreadsheetTableMap = registry.spreadsheetTableMapMap.get(spreadsheetID)
	}
	else {
		var spreadsheetStatement = registry.spreadsheetMap.get(spreadsheetID)
		spreadsheetTableMap = new Map()
		var titleIndex = undefined
		var rows = registry.spreadsheetMap.get(spreadsheetID)
		var table = undefined
		var tableNumber = 0
		for (var spreadsheetRowIndex = 0; spreadsheetRowIndex < rows.length; spreadsheetRowIndex++) {
			var row = rows[spreadsheetRowIndex]
			if (row.length > 0) {
				if (table == undefined) {
					if (row[0] == '_table') {
						table = {rows:[], headers:[]}
						if (row.length > 1) {
							spreadsheetTableMap.set(row[1], table)
						}
						else {
							spreadsheetTableMap.set('table_' + tableNumber.toString(), table)
							tableNumber++
						}
						titleIndex = spreadsheetRowIndex + 1
					}
				}
				else {
					if (row[0].startsWith('_end')) {
						table = undefined
					}
					else {
						if (spreadsheetRowIndex == titleIndex) {
							table.headers = row
						}
						else {
							table.rows.push(row)
						}
					}
				}
			}
		}
		registry.spreadsheetTableMapMap.set(spreadsheetID, spreadsheetTableMap)
	}

	return spreadsheetTableMap.get(tableID)
}

function insetsHeightAngle(height4, overhangAngle, numberOfSegments) {
console.log('deprecated')
	var height4 = Value.getValueDefault(height4, 4.0)
	var numberOfSegments = Math.max(Value.getValueDefault(numberOfSegments, 4), 1)
	var overhangAngle = Value.getValueDefault(overhangAngle, 45.0) * gRadiansPerDegree
	var insets = new Array(numberOfSegments + 1)
	var radius = height4 / Math.sin(overhangAngle)
	var radiusSquared = radius * radius
	for (var insetIndex = 0; insetIndex < insets.length; insetIndex++) {
		var y = insetIndex * height4 / numberOfSegments
		var down = height4 - y
		insets[insetIndex] = [radius - Math.sqrt(radiusSquared - down * down), y]
	}

	return insets
}

function intervalFromToBetween(from, toTen, along) {
console.log('deprecated')
	return intervalsFromToBetween(from, toTen, along)[0]
}

function intervalsFromQuantityIncrement(from = 0.0, quantity = 11, increments = 1.0, includeFrom = true) {
console.log('deprecated')
	increments = arrayKit.getArrayByValue(increments)
	if (quantity == 0) {
		noticeByList(['quantity is 0 in intervalsFromQuantityIncrement in function.', from, quantity, increments])
		return []
	}

	if (increments.length == 0) {
		noticeByList(['increments.length is 0 in intervalsFromQuantityIncrement in function.', from, quantity, increments])
		return [from]
	}

	if (quantity < 0.0) {
		Vector.reverseSigns(increments)
		quantity = -quantity
	}

	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		noticeByList(['quantityFloor is less than 1 in intervalsFromQuantityIncrement in function.', from, quantity, increments])
		return []
	}

	var properFraction = quantity - quantityFloor
	var intervals = []
	if (includeFrom) {
		intervals.push(from)
		quantityFloor -= 1
	}

	if (properFraction > gClose) {
		quantityFloor += 1
	}

	var arrayIndex = intervals.length
	intervals.length = intervals.length + quantityFloor
	var increment = 0
	for (var count = 0; count < quantityFloor; count++) {
		increment = increments[count % increments.length]
		from += increment
		intervals[arrayIndex++] = from
	}

	if (properFraction > gClose) {
		intervals[intervals.length - 1] = intervals[intervals.length - 2] + properFraction * increment
	}

	return intervals
}

function intervalsFromToAlong(from = 0.0, toTen = 10.0, alongs = 0.5, includeFrom, includeTo) {
console.log('deprecated')
	alongs = arrayKit.getArrayByValue(alongs)
	var difference = toTen - from
	var intervals = [from]
	var arrayIndex = intervals.length
	intervals.length = intervals.length + alongs.length
	for (var intervalIndex = 0; intervalIndex < alongs.length; intervalIndex++) {
		intervals[arrayIndex++] = from + alongs[intervalIndex] * difference
	}

	intervals.push(toTen)
	return removeUnincluded(intervals, includeFrom, includeTo)
}

function intervalsFromToBetween(from, toTen, alongs) {
console.log('deprecated')
	return intervalsFromToAlong(from, toTen, alongs, false, false)
}

function intervalsFromToIncrement(from, toTen, increments, includeFrom, includeTo) {
console.log('deprecated')
	from = Value.getValueDefault(from, 0.0)
	increments = Value.getValueDefault(increments, 1.0)
	increments = arrayKit.getArrayByValue(increments)
	var totalLength = 0.0
	for (var increment of increments) {
		totalLength += increment
	}

	toTen = Value.getValueDefault(toTen, 10.0)
	var difference = toTen - from
	var numberUntilEnd = Math.floor((Math.abs(difference) + gClose) / Math.abs(totalLength))
	if (numberUntilEnd == 0) {
		noticeByList(['numberUntilEnd is 0 in intervalsFromToIncrement in function.', from, toTen, increments])
		return [from]
	}

	if (totalLength == 0.0) {
		noticeByList(['totalLength is 0 in intervalsFromToIncrement in function.', from, toTen, increments])
		return [from]
	}

	var incrementMultiplier = difference / numberUntilEnd / totalLength
	for (var incrementIndex = 0; incrementIndex < increments.length; incrementIndex++) {
		increments[incrementIndex] *= incrementMultiplier
	}

	numberUntilEnd -= 1
	var intervals = [from]
	var arrayIndex = intervals.length
	intervals.length = intervals.length + numberUntilEnd
	for (var intervalIndex = 0; intervalIndex < numberUntilEnd; intervalIndex++) {
		for (var increment of increments) {
			from += increment
			intervals[arrayIndex++] = from
		}
	}

	intervals.push(toTen)
	return removeUnincluded(intervals, includeFrom, includeTo)
}

function intervalsFromToQuantity(from, toTen, quantity, includeFrom, includeTo) {
console.log('deprecated')
	from = Value.getValueDefault(from, 0.0)
	toTen = Value.getValueDefault(toTen, 10.0)
	quantity = Value.getValueDefault(quantity, 11)
	var one = 1.0
	if (quantity < 0.0) {
		one = -one
		quantity = -quantity
	}

	quantity += 1 * (includeFrom == false) + 1 * (includeTo == false)
	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		noticeByList(['quantityFloor is less than 1 in stepsFromQuantityIncrement in function.', from, quantity, increments])
		return []
	}

	var properFraction = quantity - quantityFloor
	var intervals = [from]
	quantityFloor -= 1
	quantity = quantityFloor
	if (properFraction > gClose) {
		quantityFloor++
		quantity += properFraction
	}

	var increment = (toTen - from) * one / quantity
	var arrayIndex = intervals.length
	intervals.length = intervals.length + quantityFloor
	for (var count = 0; count < quantityFloor; count++) {
		from += increment
		intervals[arrayIndex++] = from
	}

	if (properFraction > gClose) {
		intervals[intervals.length - 1] = intervals[intervals.length - 2] + properFraction * increment
	}

	return removeUnincluded(intervals, includeFrom, includeTo)
}

function joinPoints(registry, statement, sourcePoints, numberOfJoins, from, until) {
	numberOfJoins = Value.getValueDefault(numberOfJoins, 1)
	if (numberOfJoins < 1) {
		return []
	}
	if (arrayKit.getIsEmpty(sourcePoints)) {
		return []
	}
	until = Value.getValueDefault(until, 3)
	from = arrayKit.getArrayByValue(from)
	from.length = until
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			var lastPoint = points[points.length - 1]
			from.length = lastPoint.length
			arrayKit.setUndefinedElementsToArray(from, lastPoint)
		}
	}
	arrayKit.setUndefinedElementsToValue(from, 0.0)
	var joinedPoints = []
	for (var joinCount = 0; joinCount < numberOfJoins; joinCount++) {
		arrayKit.pushArray(joinedPoints, addArrays(arrayKit.getArraysCopy(sourcePoints), from, until))
		from = joinedPoints[joinedPoints.length - 1]
	}
	return joinedPoints
}

function lattice2D(numberOfXCells, numberOfYCells, cellWidth, cellHeight) {
console.log('deprecated')
	numberOfXCells = Value.getValueDefault(numberOfXCells, 2)
	numberOfYCells = Value.getValueDefault(numberOfYCells, numberOfXCells)
	cellWidth = Value.getValueDefault(cellWidth, 10)
	cellHeight = Value.getValueDefault(cellHeight, cellWidth)
	var latticePoints = new Array(numberOfXCells * numberOfYCells)
	var latticePointIndex = 0
	var startX = (1 - numberOfXCells) * cellWidth * 0.5
	var y = (1 - numberOfYCells) * cellHeight * 0.5
	for (var cellIndexY = 0; cellIndexY < numberOfYCells; cellIndexY++) {
		x = startX
		for (var cellIndexX = 0; cellIndexX < numberOfXCells; cellIndexX++) {
			latticePoints[latticePointIndex] = [x, y]
			latticePointIndex++
			x += cellWidth
		}
		y += cellHeight
	}

	return latticePoints
}

function latticePolygon(polygon, cellWidth, cellHeight) {
console.log('deprecated')
	polygon = Value.getValueDefault(polygon, [[0.0, 0.0], [20.0, 0.0], [0.0, 20.0]])
	cellWidth = Math.abs(Value.getValueDefault(cellWidth, 10))
	cellHeight = Value.getValueDefault(cellHeight, cellWidth)
	if (cellHeight == 0.0 || cellWidth == 0.0) {
		return []
	}

	var halfCellHeight = cellHeight * 0.5
	var halfCellWidth = cellWidth * 0.5
	polygon = arrayKit.getArraysCopy(polygon)
	multiplyArraysByIndex(polygon, 1.0 / cellHeight, 1)
	addArraysByIndex(polygon, -0.5, 1)
	var intersectionPairsMap = getIntersectionPairsMap([polygon])
	var latticePoints = []
	for (var intersectionPairsKey of intersectionPairsMap.keys()) {
		var intersectionPairs = intersectionPairsMap.get(intersectionPairsKey)
		var y = intersectionPairsKey * cellHeight + halfCellHeight
		for (var intersectionPair of intersectionPairs) {
			var x = Math.floor(intersectionPair.beginIntersection / cellWidth + 0.5) * cellWidth + halfCellWidth
			for (var whileCount = 0; whileCount < gLengthLimit; whileCount++) {
				if (x > intersectionPair.endIntersection) {
					break
				}
				latticePoints.push([x, y])
				x += cellWidth
			}
		}
	}

	return latticePoints
}

function mirror(registry, statement, center, direction, isSegment) {
console.log('deprecated')
	var variableMap = getVariableMapByStatement(statement)
	if (!variableMap.has('_points')) {
		noticeByList(['In mirror in function the variableMap does not have _points:', statement])
		return [[]]
	}

	var points = variableMap.get('_points')
	if (points.length == 0) {
		noticeByList(['In mirror in function _points length is 0:', points, toX, toY, statement])
		return [[]]
	}

	var centerVector = {center:center, vector:Vector.polarCounterclockwise(Value.getValueDefault(direction, 90.0) * gRadiansPerDegree)}
	var mirrorStart = points.length
	if (Value.getValueFalse(isSegment)) {
		if (points.length < 3) {
			noticeByList(['In mirror in function _points length is shorter than 3:', points, toX, toY, statement])
			return [[]]
		}
		centerVector = getCenterVectorMirrorStart(mirrorStart, points)
		mirrorStart = centerVector.mirrorStart
	}

	return getMirrorPoints(centerVector, mirrorStart, points)
}

function operation(registry, statement, symbol, elements, otherElements) {
	if (arrayKit.getIsEmpty(elements)) {
		return []
	}

	if (otherElements == null || otherElements == undefined) {
		return []
	}

	otherElements = arrayKit.getArrayByValue(otherElements)
	if (otherElements.length == 0) {
		return []
	}
	var symbol = Value.getValueDefault(symbol, '+')
	var monad = new VariableMonad()
	for (var character of symbol) {
		monad = monad.getNextMonad(character, registry, statement)
	}
	var previousMonad = monad.previousMonad
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		previousMonad.value = elements[elementIndex]
		elements[elementIndex] = monad.getResult(registry, statement, otherElements[elementIndex % otherElements.length])
	}
	return elements
}

function parabolaFromToQuantity(registry, statement, fromPoint, toPoint, quantity, fromLevel, horizontal, includeFrom, includeTo) {
console.log('deprecated')
	toPoint = arrayKit.getArrayByValue(Value.getValueDefault(toPoint, [10.0, 10.0]))
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	return parabolaFromToQuantityOnly(fromPoint, toPoint, quantity, fromLevel, horizontal, includeFrom, includeTo)
}

function parabolaFromToQuantityOnly(fromPoint, toPoint, quantity, fromLevel, horizontal, includeFrom, includeTo) {
console.log('deprecated')
	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	arrayKit.setUndefinedElementsToValue(toPoint, 0.0)
	var fromLevel = Value.getValueTrue(fromLevel)
	horizontal = Value.getValueTrue(horizontal)
	fromPoint = fromPoint.slice(0)
	if (!horizontal) {
		swap2DPoint(fromPoint)
		toPoint = toPoint.slice(0)
		swap2DPoint(toPoint)
	}

	var fromTo = Vector.getSubtractionArray(toPoint, fromPoint, 3)
	if (fromTo[0] == 0.0) {
		noticeByList(['fromTo[0] is 0 in parabolaFromTo in function.', fromPoint, toPoint, quantity])
		return []
	}

	var quantity = Value.getValueDefault(quantity, 11)
	if (quantity < 0.0) {
		fromTo[0] = -fromTo[0]
		quantity = -quantity
	}

	quantity += 1 * (includeFrom == false) + 1 * (includeTo == false)
	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		noticeByList(['quantityFloor is less than 1 in parabolaFromTo in function.', fromPoint, toPoint, quantity])
		return []
	}

	var properFraction = quantity - quantityFloor
	var parabola = [fromPoint]
	quantityFloor--
	quantity = quantityFloor
	if (properFraction > gClose) {
		quantityFloor++
		quantity += properFraction
	}

	var arrayIndex = parabola.length
	parabola.length = parabola.length + quantityFloor
	var xMultiplier = fromTo[1] / fromTo[0] / fromTo[0]
	var incrementX = fromTo[0] / quantity
	var x = incrementX
	var zAddition = undefined
	if (fromPoint.length > 2) {
		zAddition = fromTo[2] / fromTo[0]
	}

	for (var count = 0; count < quantityFloor; count++) {
		parabola[arrayIndex++] = getParabolicFrom(fromPoint, fromTo, fromLevel, x, xMultiplier, zAddition)
		x += incrementX
	}

	if (properFraction > gClose) {
		x = parabola[parabola.length - 2][0] + properFraction * incrementX
		parabola[parabola.length - 1] = getParabolicFrom(fromPoint, fromTo, fromLevel, x, xMultiplier, zAddition)
	}

	if (!horizontal) {
		swap2DPolyline(parabola)
	}

	return removeUnincluded(parabola, includeFrom, includeTo)
}

function parabolaToQuantity(registry, statement, toPoint, quantity, fromLevel, horizontal, includeFrom, includeTo) {
	var fromLength = 2
	if (Array.isArray(toPoint)) {
		fromLength = toPoint.length
	}

	return parabolaFromToQuantity(registry, statement, new Array(fromLength), toPoint, quantity, fromLevel, horizontal, false, includeTo)
}

function point(registry, statement, name, x, y, z) {
console.log('deprecated')
	var pointArgumentsLength = arguments.length - 3
	var point = new Array(pointArgumentsLength)
	for (var argumentIndex = 0; argumentIndex < pointArgumentsLength; argumentIndex++) {
		point[argumentIndex] = arguments[argumentIndex + 3]
	}
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(point, points[points.length - 1])
		}
	}
	arrayKit.setUndefinedElementsToValue(point, 0.0)
	variableMap.set(name, point.toString())
	return point
}

function pointsByID(registry, statement, id, x, y, z) {
console.log('deprecated')
	var pointArgumentsLength = arguments.length - 3
	var points = getPointsHD(registry, getStatementByID(registry, statement, id))
	for (var point of points) {
		for (var argumentIndex = 0; argumentIndex < pointArgumentsLength; argumentIndex++) {
			if (point.length < pointArgumentsLength) {
				point.length = pointArgumentsLength
				arrayKit.setUndefinedElementsToValue(point)
			}
			point[argumentIndex] += arguments[argumentIndex + 3]
		}
	}

	return points
}

function removeUnincluded(elements, includeFrom = true, includeTo = true) {
	if (includeTo == false && elements.length > 0) {
		elements.pop()
	}

	if (includeFrom == false && elements.length > 0) {
		elements.splice(0, 1)
	}

	return elements
}

function rightByID(registry, statement, id) {
console.log('deprecated')
	var boundingBox = getGroupBoundingBoxByArguments(id, registry, statement)
	if (boundingBox.length == 0) {
		return 0.0
	}

	return boundingBox[1][0]
}

function setAttributesArraysByID(registry, statement, id) {
	if (registry.spreadsheetMap == undefined) {
		return
	}

	if (!registry.spreadsheetMap.has(id)) {
		return
	}

	if (registry.spreadsheetArraysMapMap == undefined) {
		registry.spreadsheetArraysMapMap = new Map()
	}

	var spreadsheetArraysMap = undefined
	if (registry.spreadsheetArraysMapMap.has(id)) {
		spreadsheetArraysMap = registry.spreadsheetArraysMapMap.get(id)
	}
	else {
		spreadsheetArraysMap = getSpreadsheetArraysMap(registry.spreadsheetMap.get(id))
		registry.spreadsheetArraysMapMap.set(id, spreadsheetArraysMap)
	}

	for (var arrayEntry of spreadsheetArraysMap) {
		var rows = arrayEntry[1]
		for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
			rows[rowIndex] = rows[rowIndex].join(';')
		}
		statement.attributeMap.set(arrayEntry[0], rows.join(' '))
	}
}

function setAttributeByID(registry, statement, id, key, value) {
console.log('deprecated')
	getStatementByID(registry, statement, id).attributeMap.set(key, value.toString())
	return value
}

function setAttributesRowTable(registry, statement, rowIndex) {
	var id = getVariableValue('spreadsheetID', statement.parent)
	setAttributesTableByID(registry, statement, id, rowIndex, getVariableValue('tableID', statement.parent))
}

function setAttributesTableByID(registry, statement, id, rowIndex, tableID) {
	var table = getSpreadsheetTable(registry, id, tableID)
	if (table == undefined) {
		return
	}

	if (rowIndex >= table.rows.length) {
		return
	}

	var row = table.rows[rowIndex]
	var headers = table.headers
	if (headers.length < row.length) {
		headers.length = row.length
	}

	for (var columnIndex = 0; columnIndex < row.length; columnIndex++) {
		if (arrayKit.getIsEmpty(headers[columnIndex])) {
			headers[columnIndex] = 'Column_' + getBaseAlphabet(columnIndex)
		}
		statement.attributeMap.set(headers[columnIndex], row[columnIndex])
	}
}

function sineWaveXFromToCycles(xs, from, to, numberOfCycles, phase, numberOfSegments) {
console.log('deprecated')
	var from = Value.getValueDefault(from, 0.0)
	var to = Value.getValueDefault(to, 4.0)
	var numberOfCycles = Value.getValueDefault(numberOfCycles, 1.0)
	var xs = Value.getValueDefault(xs, intervalsFromToIncrement(from, to, 0.5 / numberOfCycles))
	var numberOfSegments = Value.getValueDefault(numberOfSegments, 24)
	var sinPoints = new Array(xs.length)
	var wavelength = Math.abs(to - from) / numberOfCycles
	var oneOverWavelengthSegments = wavelength / numberOfSegments
	for (var xIndex = 0; xIndex < xs.length; xIndex++) {
		sinPoints[xIndex] = [xs[xIndex], sineYXFromToCycles(xs[xIndex], from, to, numberOfCycles, phase)]
	}

	return sinPoints
}

function sineYXFromToCycles(x, from, to, numberOfCycles, phase) {
console.log('deprecated')
	var x = Value.getValueDefault(x, 0.0)
	var from = Value.getValueDefault(from, 0.0)
	var to = Value.getValueDefault(to, 4.0)
	var numberOfCycles = Value.getValueDefault(numberOfCycles, 1.0)
	var phase = Value.getValueDefault(phase, 0.0) * gRadiansPerDegree
	var wavelength = Math.abs(to - from) / numberOfCycles
	return Math.sin((x + from) * gPI2 / wavelength + phase)
}

function spiralBeforeFromTo(registry, statement, before, fromPoint, toPoint, numberOfSides, includeBefore, includeFrom, includeTo) {
console.log('deprecated')
	before = arrayKit.getArrayByValue(before)
	before.length = 2
	toPoint = arrayKit.getArrayByValue(Value.getValueDefault(toPoint, 10.0))
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 1) {
			arrayKit.setUndefinedElementsToArray(before, points[points.length - 2])
		}
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	before = [Value.getValueDefault(before[0], -10.0), Value.getValueDefault(before[1], 0.0)]
	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	toPoint[0] = Value.getValueDefault(toPoint[0], 10.0)
	arrayKit.setUndefinedElementsToValue(toPoint, 0.0)
	includeBefore = Value.getValueTrue(includeBefore)
	includeFrom = Value.getValueTrue(includeFrom)
	includeTo = Value.getValueTrue(includeTo)
	var beforeFrom = Vector.subtract2D(fromPoint.slice(0), before)
	var beforeFromLength = Vector.length2D(beforeFrom)
	var fromTo = Vector.subtract2D(toPoint.slice(0), fromPoint)
	var fromToLength = Vector.length2D(fromTo)
	var arc = []
	if (includeBefore) {
		arc.push(before)
	}

	if (beforeFromLength == 0.0 || fromToLength == 0.0) {
		return arc
	}

	Vector.divide2DScalar(beforeFrom, beforeFromLength)
	Vector.divide2DScalar(fromTo, fromToLength)
	var angle = 4.0 * Math.asin(0.5 * Vector.distance2D(beforeFrom, fromTo)) * gDegreesPerRadian
	if (Vector.crossProduct2D(beforeFrom, fromTo) < 0.0) {
		angle = -angle
	}

	arrayKit.pushArray(arc, spiralFromToAngle(registry, statement, fromPoint, toPoint, angle, numberOfSides, includeFrom, includeTo))
	return arc
}

function spiralCenterRadius(center, radius, fromAngle, toAngle, numberOfSides, toZ, includeFrom, includeTo) {
console.log('deprecated')
	center = arrayKit.getArrayByElements(center, 2)
	radius = Value.getValueDefault(radius, 10.0)
	fromAngle = Value.getValueDefault(fromAngle, 0.0) * gRadiansPerDegree
	toAngle = Value.getValueDefault(toAngle, 360.0) * gRadiansPerDegree
	return spiralCenterRadiusOnly(center, radius, fromAngle, toAngle, numberOfSides, toZ, includeFrom, includeTo)
}

function spiralFromToAngle(registry, statement, fromPoint, toPoint, angle, numberOfSides, includeFrom, includeTo) {
console.log('deprecated')
	toPoint = arrayKit.getArrayByValue(Value.getValueDefault(toPoint, 10.0))
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	arrayKit.setUndefinedElementsToValue(toPoint, 0.0)
	return spiralFromToAngleOnly(fromPoint, toPoint, angle, numberOfSides, includeFrom, includeTo)
}

function spiralFromToRadius(
registry, statement, fromPoint, toPoint = 10.0, radius, counterclockwise = true, numberOfSides = 24, includeFrom = true, includeTo = true) {
console.log('deprecated')
	toPoint = arrayKit.getArrayByValue(toPoint)
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	arrayKit.setUndefinedElementsToValue(toPoint, 0.0)
	var fromTo = Vector.subtract2D(toPoint.slice(0), fromPoint)
	var fromToLength = Vector.length2D(fromTo)
	var arc = [fromPoint]
	if (fromToLength == 0.0) {
		noticeByList(['fromToLength is 0 in spiralFromToRadius in function.', fromPoint, toPoint, radius])
		return arc
	}

	var center = getMidpoint2D(fromPoint.slice(0), toPoint)
	var halfFromToLength = 0.5 * fromToLength
	radius = Value.getValueDefault(radius, halfFromToLength)
	if (Math.abs(radius) < halfFromToLength) {
		return arc
	}

	if (counterclockwise != radius > 0.0) {
		fromToLength = -fromToLength
	}

	var midpointCenterDistance = Math.sqrt(radius * radius - halfFromToLength * halfFromToLength) / fromToLength
	Vector.add2D(center, Vector.multiply2DScalar([fromTo[1], -fromTo[0]], midpointCenterDistance))
	var centerFrom = normalize2D(Vector.getSubtraction2D(fromPoint, center))
	var centerTo = normalize2D(Vector.getSubtraction2D(toPoint, center))
	var angle = 2.0 * Math.asin(0.5 * Vector.distance2D(centerFrom, centerTo))
	if (radius < 0.0) {
		angle = gPI2 - angle
	}

	var numberOfArcSides = Math.ceil(numberOfSides * angle / gPI2 - gClose)
	arc.length = numberOfArcSides
	if (counterclockwise) {
		angle = -angle
	}

	var zAddition = undefined
	if (fromPoint.length > 2) {
		zAddition = (toPoint[2] - fromPoint[2]) / numberOfArcSides
		centerFrom.push(0.0)
	}

	var rotator = Vector.polarCounterclockwise(angle / numberOfArcSides)
	Vector.multiply2DScalar(centerFrom, Math.abs(radius))
	for (var pointIndex = 1; pointIndex < numberOfArcSides; pointIndex++) {
		Vector.rotate2DVector(centerFrom, rotator)
		if (zAddition != undefined) {
			centerFrom[2] += zAddition
		}
		arc[pointIndex] = Vector.getAdditionArray(center, centerFrom)
	}

	arc.push(toPoint)
	return removeUnincluded(arc, includeFrom, includeTo)
}

function spiralTo(registry, statement, toPoint, numberOfSides, includeTo) {
	var fromLength = 2
	if (Array.isArray(toPoint)) {
		fromLength = toPoint.length
	}

	return spiralBeforeFromTo(
	registry, statement, new Array(fromLength), new Array(fromLength), toPoint, numberOfSides, false, false, includeTo)
}

function spiralToAngle(registry, statement, toPoint, angle, numberOfSides, includeTo) {
	var fromLength = 2
	if (Array.isArray(toPoint)) {
		fromLength = toPoint.length
	}

	return spiralFromToAngle(registry, statement, new Array(fromLength), toPoint, angle, numberOfSides, false, includeTo)
}

function spiralToRadius(registry, statement, toPoint, radius, counterclockwise, numberOfSides, includeTo) {
	var fromLength = 2
	if (Array.isArray(toPoint)) {
		fromLength = toPoint.length
	}

	return spiralFromToRadius(
	registry, statement, new Array(fromLength), toPoint, radius, counterclockwise, numberOfSides, false, includeTo)
}

function stepFromToBetween(registry, statement, fromPoint, toPoint, along) {
	return stepsFromToBetween(registry, statement, fromPoint, toPoint, along)[0]
}

function stepFromToDistance(registry, statement, fromPoint, toPoint, distance) {
console.log('deprecated')
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint = arrayKit.getArrayByValue(Value.getValueDefault(toPoint, 10.0))
	toPoint.length = fromPoint.length
	arrayKit.setUndefinedElementsToValue(toPoint, 0.0)
	var distance = Value.getValueDefault(distance, 1.0)
	var fromTo = Vector.getSubtractionArray(toPoint, fromPoint)
	var fromToLength = Vector.length2D(fromTo)
	if (fromToLength == 0.0) {
		return fromPoint
	}

	return Vector.getAddition2D(fromPoint, Vector.multiply2DScalar(fromTo, distance / fromToLength))
}

function stepsFromQuantityIncrement(registry, statement, fromPoint, quantity, increments, includeFrom) {
console.log('deprecated')
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	includeFrom = Value.getValueTrue(includeFrom)
	increments = Value.getValueDefault(increments, [1.0, 0.0])
	increments = arrayKit.getArrayByValue(increments)
	quantity = Value.getValueDefault(quantity, 11)
	if (increments.length == 0) {
		noticeByList(['increments.length is 0 in stepsFromQuantityIncrement in function.', fromPoint, quantity, increments])
		return [fromPoint]
	}

	if (arrayKit.getIsEmpty(increments[0])) {
		noticeByList(['increments zero is empty in stepsFromQuantityIncrement in function.', fromPoint, quantity, increments])
		return [fromPoint]
	}

	if (!Array.isArray(increments[0])) {
		increments = [increments]
	}

	if (quantity < 0.0) {
		for (var parameters of increments) {
			Vector.reverseSigns(parameters)
		}
		quantity = -quantity
	}

	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		noticeByList(['quantityFloor is less than 1 in stepsFromQuantityIncrement in function.', fromPoint, quantity, increments])
		return []
	}

	var properFraction = quantity - quantityFloor
	fromPoint = fromPoint.slice(0)
	var steps = []
	if (includeFrom) {
		steps.push(fromPoint.slice(0))
		quantityFloor--
	}

	if (properFraction > gClose) {
		quantityFloor += 1
	}

	var arrayIndex = steps.length
	steps.length = steps.length + quantityFloor
	var increment = []
	for (var count = 0; count < quantityFloor; count++) {
		increment = increments[count % increments.length]
		Vector.addArray(fromPoint, increment)
		steps[arrayIndex++] = fromPoint.slice(0)
	}

	if (properFraction > gClose) {
		steps[steps.length - 1] = Vector.addArray(steps[steps.length - 2].slice(0), Vector.multiplyArrayScalar(increment, properFraction))
	}

	return steps
}

function stepsFromToAlong(registry, statement, fromPoint, toPoint, alongs, includeFrom, includeTo) {
console.log('deprecated')
	alongs = Value.getValueDefault(alongs, 0.5)
	alongs = arrayKit.getArrayByValue(alongs)
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint = arrayKit.getArrayByValue(Value.getValueDefault(toPoint, 10.0))
	toPoint.length = fromPoint.length
	arrayKit.setUndefinedElementsToValue(toPoint, 0.0)
	var fromTo = Vector.getSubtractionArray(toPoint, fromPoint)
	var steps = [fromPoint]
	var arrayIndex = steps.length
	steps.length = steps.length + alongs.length
	for (var stepIndex = 0; stepIndex < alongs.length; stepIndex++) {
		steps[arrayIndex++] = Vector.addArray(Vector.multiplyArrayScalar(fromTo.slice(0), alongs[stepIndex]), fromPoint)
	}

	steps.push(toPoint)
	return removeUnincluded(steps, includeFrom, includeTo)
}

function stepsFromToBetween(registry, statement, fromPoint, toPoint, alongs) {
	return stepsFromToAlong(registry, statement, fromPoint, toPoint, alongs, false, false)
}

function stepsFromToQuantity(registry, statement, fromPoint, toPoint, quantity, includeFrom, includeTo) {
console.log('deprecated')
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint = arrayKit.getArrayByValue(Value.getValueDefault(toPoint, 10.0))
	toPoint.length = fromPoint.length
	arrayKit.setUndefinedElementsToValue(toPoint, 0.0)
	quantity = Value.getValueDefault(quantity, 11)
	var one = 1.0
	if (quantity < 0.0) {
		one = -one
		quantity = -quantity
	}

	quantity += 1 * (includeFrom == false) + 1 * (includeTo == false)
	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		noticeByList(['quantityFloor is less than 1 in stepsFromQuantityIncrement in function.', fromPoint, quantity, increments])
		return []
	}

	var properFraction = quantity - quantityFloor
	fromPoint = fromPoint.slice(0)
	var steps = [fromPoint.slice(0)]
	quantityFloor--
	quantity = quantityFloor
	if (properFraction > gClose) {
		quantityFloor++
		quantity += properFraction
	}

	var increment = Vector.multiplyArrayScalar(Vector.getSubtractionArray(toPoint, fromPoint), one / quantity)
	var arrayIndex = steps.length
	steps.length = steps.length + quantityFloor
	for (var count = 0; count < quantityFloor; count++) {
		Vector.addArray(fromPoint, increment)
		steps[arrayIndex++] = fromPoint.slice(0)
	}

	if (properFraction > gClose) {
		steps[steps.length - 1] = Vector.addArray(steps[steps.length - 2].slice(0), Vector.multiplyArrayScalar(increment, properFraction))
	}

	return removeUnincluded(steps, includeFrom, includeTo)
}

function stepsQuantityIncrement(registry, statement, quantity, increments) {
console.log('deprecated')
	increments = Value.getValueDefault(increments, [1.0, 0.0])
	increments = arrayKit.getArrayByValue(increments)
	if (increments.length == 0) {
		noticeByList(['increments.length is 0 in stepsQuantityIncrement in function.', fromPoint, quantity, increments])
		return []
	}

	if (arrayKit.getIsEmpty(increments[0])) {
		noticeByList(['increments zero is empty in stepsQuantityIncrement in function.', fromPoint, quantity, increments])
		return []
	}

	if (!Array.isArray(increments[0])) {
		increments = [increments]
	}

	var fromPoint = new Array(increments[0].length)
	return stepsFromQuantityIncrement(registry, statement, fromPoint, Value.getValueDefault(quantity, 10), increments, false)
}

function stepsToAlong(registry, statement, toPoint, alongs, includeTo) {
	var fromLength = 2
	if (Array.isArray(toPoint)) {
		fromLength = toPoint.length
	}

	return stepsFromToAlong(registry, statement, new Array(fromLength), toPoint, alongs, false, includeTo)
}

function stepsToBetween(registry, statement, toPoint, alongs) {
	var fromLength = 2
	if (Array.isArray(toPoint)) {
		fromLength = toPoint.length
	}

	return stepsFromToBetween(registry, statement, new Array(fromLength), toPoint, alongs)
}

function stepsToQuantity(registry, statement, toPoint, quantity, includeTo) {
	var fromLength = 2
	if (Array.isArray(toPoint)) {
		fromLength = toPoint.length
	}

	return stepsFromToQuantity(registry, statement, new Array(fromLength), toPoint, quantity, false, includeTo)
}

function stepToBetween(registry, statement, toPoint, along) {
	return stepsToBetween(registry, statement, toPoint, along)[0]
}

function stringLength(text) {
console.log('deprecated')
	return text.length
}

function topByID(registry, statement, id) {
console.log('deprecated')
	var boundingBox = getGroupBoundingBoxByArguments(id, registry, statement)
	if (boundingBox.length == 0) {
		return 0.0
	}

	return boundingBox[1][1]
}

function zigzag(polyline, radiusMultiplier, numberOfSides) {
console.log('deprecated')
	if (polyline.length < 3) {
		return polyline
	}
	var numberOfSides = Value.getValueDefault(numberOfSides, 24)
	var radiusMultiplier = Value.getValueDefault(radiusMultiplier, 0.2)
	var centerIntersections = new Array(polyline.length)
	centerIntersections[0] = {intersection:polyline[0]}
	centerIntersections[polyline.length - 1] = {intersection:polyline[polyline.length - 1]}
	var zigzagPolyline = [polyline[0]]
	for (var vertexIndex = 1; vertexIndex < polyline.length - 1; vertexIndex++) {
		var beginPoint = polyline[vertexIndex - 1]
		var centerPoint = polyline[vertexIndex]
		var centerBegin = Vector.getSubtraction2D(beginPoint, centerPoint)
		var centerBeginLength = Vector.length2D(centerBegin)
		var endPoint = polyline[vertexIndex + 1]
		var centerEnd = Vector.getSubtraction2D(endPoint, centerPoint)
		var centerEndLength = Vector.length2D(centerEnd)
		var intersection = Vector.getMultiplication2DScalar(centerBegin, 0.5)
		Vector.add2D(intersection, centerPoint)
		Vector.divide2DScalar(centerBegin, centerBeginLength)
		Vector.divide2DScalar(centerEnd, centerEndLength)
		centerIntersections[vertexIndex] = {
		centerBegin:centerBegin, centerBeginLength:centerBeginLength,
		centerEnd:centerEnd, centerEndLength:centerEndLength, centerPoint:centerPoint, intersection:intersection}
	}
	for (var vertexIndex = 1; vertexIndex < polyline.length - 1; vertexIndex++) {
		var centerIntersection = centerIntersections[vertexIndex]
		var centerPoint = centerIntersection.centerPoint
		var middleBegin = Vector.getAddition2D(centerIntersection.centerBegin, centerIntersection.centerEnd)
		normalize2D(middleBegin)
		var beginEndDistance = Math.min(1.0, Vector.distance2D(centerIntersection.centerBegin, centerIntersection.centerEnd))
		beginEndDistance *= radiusMultiplier
		var right = [middleBegin[1], -middleBegin[0]]
		var dotProduct = Vector.dotProduct2D(right, centerIntersection.centerBegin)
		if (dotProduct < 0.0) {
			Vector.multiply2DScalar(right, -1)
		}
		var left = Vector.getMultiplication2DScalar(right, -1.0)
		Vector.multiply2DScalar(left, centerIntersection.centerEndLength * beginEndDistance)
		Vector.multiply2DScalar(right, centerIntersection.centerBeginLength * beginEndDistance)
		var rightPoint = Vector.getAddition2D(centerPoint, right)
		var rightBefore = Vector.getSubtraction2D(centerIntersection.intersection, rightPoint)
		var leftPoint = Vector.getAddition2D(centerPoint, left)
		var leftAfter = Vector.getSubtraction2D(centerIntersections[vertexIndex + 1].intersection, leftPoint)
		var quarterNumberOfSides = Math.ceil(numberOfSides * 0.25)
		for (var pointIndex = quarterNumberOfSides - 1; pointIndex > 0; pointIndex--) {
			var along = pointIndex / quarterNumberOfSides
			var combinedPoint = Vector.getAddition2D(rightPoint, Vector.getMultiplication2DScalar(rightBefore, along))
			var alongRight = Vector.getAddition2D(centerPoint, Vector.getMultiplication2DScalar(right, along))
			Vector.add2D(Vector.multiply2DScalar(combinedPoint, along), Vector.multiply2DScalar(alongRight, 1.0 - along))
			zigzagPolyline.push(combinedPoint)
		}
		zigzagPolyline.push(centerPoint)
		for (var pointIndex = 1; pointIndex < quarterNumberOfSides; pointIndex++) {
			var along = pointIndex / quarterNumberOfSides
			var combinedPoint = Vector.getAddition2D(leftPoint, Vector.getMultiplication2DScalar(leftAfter, along))
			var alongLeft = Vector.getAddition2D(centerPoint, Vector.getMultiplication2DScalar(left, along))
			Vector.add2D(Vector.multiply2DScalar(combinedPoint, along), Vector.multiply2DScalar(alongLeft, 1.0 - along))
			zigzagPolyline.push(combinedPoint)
		}
	}
	zigzagPolyline.push(polyline[polyline.length - 1])
	return zigzagPolyline
}

function zoomInterpolation(x, polyline, point, center, arrayLength) {
console.log('deprecated')
	center = arrayKit.getArrayByElements(center, arrayLength)
	point = arrayKit.getArrayByElements(point, arrayLength)
	var centerPoint = Vector.getSubtractionArray(point, center, arrayLength)
	var interpolationAlong = getFlatInterpolationAlongBeginEnd(x, polyline)
	var along = interpolationAlong[0]
	var oneMinus = 1.0 - along
	var lower = interpolationAlong[1]
	var upper = interpolationAlong[2]
	var minimumLength = Math.min(lower.length, upper.length)
	var interpolation = new Array(arrayLength).fill(0.0)
	for (var dimensionIndex = 1; dimensionIndex < minimumLength; dimensionIndex++) {
		var dimensionModulo = dimensionIndex % arrayLength
		var parameter = oneMinus * lower[dimensionIndex] + along * upper[dimensionIndex]
		interpolation[dimensionModulo] = centerPoint[dimensionModulo] * (parameter - 1.0)
	}
	return interpolation
}

function zoomInterpolation2D(x, polyline, point, center) {
	return zoomInterpolation(x, polyline, point, center, 2)
}

function zoomInterpolation3D(x, polyline, point, center) {
	return zoomInterpolation(x, polyline, point, center, 3)
}
