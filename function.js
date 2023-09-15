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

function alongsFromToDistance(from, to, fromDistances, toDistances) {
	fromDistances = getValueDefault(fromDistances, [])
	fromDistances = getArrayByValue(fromDistances)
	toDistances = getValueDefault(toDistances, [])
	toDistances = getArrayByValue(toDistances)
	var alongs = new Array(fromDistances.length + toDistances.length)
	from = getValueDefault(from, [0.0, 0.0])
	from = getArrayByValue(from)
	to = getValueDefault(to, [10.0, 0.0])
	to = getArrayByValue(to)
	var oneOverDistance = 1.0 / distanceArray(from, to)
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
	var from = getValueDefault(from, 0.0)
	var to = getValueDefault(to, 4.0)
	var xs = getValueDefault(xs, intervalsFromToIncrement(from, to, 0.5))
	var arcs = new Array(xs.length)
	for (var xIndex = 0; xIndex < xs.length; xIndex++) {
		arcs[xIndex] = [xs[xIndex], arcYXFromToHeight(xs[xIndex], from, to, height, phase)]
	}
	return arcs
}

function arcYXFromToHeight(x, from, to, height, phase) {
	var x = getValueDefault(x, 0.0)
	var from = getValueDefault(from, 0.0)
	var to = getValueDefault(to, 4.0)
	var height = getValueDefault(height, 1.0)
	var phase = getValueDefault(phase, 0.0)
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
	return getStatementByID(registry, statement, id).attributeMap.get(key)
}

function border(registry, statement) {
	return 10.0
}

function bracket(center, side) {
	center = getValueDefault(center, 0.0)
	side = getValueDefault(side, 1.0)
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
	const center = {text:'Center', point:[0.0, 0.0]}
	const centerX = {text:'Center X', value:0.0}
	const centerY = {text:'Center Y', value:0.0}
	const counterclockwise = {text:'Counterclockwise', checked:true}
	const direction = {text:'Direction', lower:-180.0, upper:180.0, value:90.0}
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
	const numberOfSides = {text:'Sides', lower:3, upper:60, value:24}
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
	gPolylineDefinitionsMap.set('arcBeforeFromTo',
	[beforeX, beforeY, fromX, fromY, toX, toY, numberOfSides, includeBefore, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('arcCenterRadius', [centerX, centerY, radius, fromAngle, toAngle, numberOfSides, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('arcFromToAngle', [fromX, fromY, toX, toY, angle, numberOfSides, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('arcFromToRadius',
	[fromX, fromY, toX, toY, radius, counterclockwise, numberOfSides, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('arcTo', [toX, toY, numberOfSides, includeTo])
	gPolylineDefinitionsMap.set('arcToAngle', [toX, toY, angle, numberOfSides, includeTo])
	gPolylineDefinitionsMap.set('arcToRadius', [toX, toY, radius, counterclockwise, numberOfSides, includeTo])
	gPolylineDefinitionsMap.set('arcWaveXFromToHeight', [xs, from, to, height, phase])
	gPolylineDefinitionsMap.set('arcYXFromToHeight', [x, from, to, height, phase])
	gPolylineDefinitionsMap.set('ellipseFromToRadius', [x, fromPoint, toPoint, radius, numberOfSides, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('ellipseToRadius', [x, toPoint, radius, numberOfSides, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('insetsHeightAngle', [height4, overhangAngle, numberOfSegments])
	gPolylineDefinitionsMap.set('intervalFromToBetween', [from, toTen, along])
	gPolylineDefinitionsMap.set('intervalsFromQuantityIncrement', [from, quantity, increments, includeFrom])
	gPolylineDefinitionsMap.set('intervalsFromToAlong', [from, toTen, alongs, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('intervalsFromToBetween', [from, toTen, alongs])
	gPolylineDefinitionsMap.set('intervalsFromToIncrement', [from, toTen, increments, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('intervalsFromToQuantity', [from, toTen, quantity, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('lattice2D', [numberOfXCells, numberOfYCells, cellWidth, cellHeight])
	gPolylineDefinitionsMap.set('latticePolygon', [polygon, cellWidth, cellHeight])
	gPolylineDefinitionsMap.set('mirrorJoin', [center, direction])
	gPolylineDefinitionsMap.set('parabolaFromToQuantity', [fromPoint, toPoint, quantity, fromLevel, horizontal, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('parabolaToQuantity', [toPoint, quantity, fromLevel, horizontal, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('sineYXFromToCycles', [x, from, to, numberOfCycles, phase])
	gPolylineDefinitionsMap.set('spiralBeforeFromTo', [before, fromPoint, toPoint, numberOfSides, includeBefore, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('spiralCenterRadius', [center, radius, fromAngle, toAngle, numberOfSides, toZ, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('spiralFromToAngle', [fromPoint, toPoint, angle, numberOfSides, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('spiralFromToRadius', [fromPoint, toPoint, radius, counterclockwise, numberOfSides, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('spiralTo', [toPoint, numberOfSides, includeTo])
	gPolylineDefinitionsMap.set('spiralToAngle', [toPoint, angle, numberOfSides, includeTo])
	gPolylineDefinitionsMap.set('spiralToRadius', [toPoint, radius, counterclockwise, numberOfSides, includeTo])
	gPolylineDefinitionsMap.set('stepFromToBetween', [fromPoint, toPoint, along])
	gPolylineDefinitionsMap.set('stepsFromQuantityIncrement', [fromPoint, quantity, increments, includeFrom])
	gPolylineDefinitionsMap.set('stepsFromToAlong', [fromPoint, toPoint, alongs, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('stepsFromToBetween', [fromPoint, toPoint, alongs])
	gPolylineDefinitionsMap.set('stepsFromToQuantity', [fromPoint, toPoint, quantity, includeFrom, includeTo])
	gPolylineDefinitionsMap.set('stepsQuantityIncrement', [quantity, increments])
	gPolylineDefinitionsMap.set('stepsToQuantity', [toPoint, quantity, includeTo])
	gPolylineDefinitionsMap.set('stepToBetween', [toPoint, along])
//	gPolylineDefinitionsMap.set('toward', [point, distance, x, y])//stepFromToDistance
/*
function (registry, statement, ) {
function (registry, statement, ) {
function (registry, statement, ) {
function () {
*/
}

function ellipseFromToRadius(registry, statement, fromPoint, toPoint, radius, numberOfSides, includeFrom, includeTo) {
	toPoint = getArrayByValue(getValueDefault(toPoint, 10.0))
	fromPoint = getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	setUndefinedElementsToValue(toPoint, 0.0)
	var center = getMidpoint2D(fromPoint, toPoint)
	var centerFrom = getSubtraction2D(fromPoint, center)
	var centerFromLength = length2D(centerFrom)
	var numberOfSides = getValueDefault(numberOfSides, 24)
	var radius = getValueDefault(radius, 1.0)
	includeFrom = getValueTrue(includeFrom)
	includeTo = getValueTrue(includeTo)
	var arc = []
	if (includeFrom) {
		arc.push(fromPoint)
	}
	if (centerFromLength == 0.0) {
		return arc
	}
	var right = divide2DScalar([centerFrom[1], -centerFrom[0]], centerFromLength * Math.sqrt(centerFromLength))
	var numberOfArcSides = Math.ceil(numberOfSides * Math.abs(Math.PI) / gDoublePi - gClose)
	var zAddition = null
	if (fromPoint.length > 2) {
		zAddition = (toPoint[2] - fromPoint[2]) / numberOfArcSides
		center.push(0.0)
		centerFrom.push(fromPoint[2])
	}
	var rotator = polarCounterclockwise(Math.PI / numberOfArcSides)
	numberOfArcSides -= 1
	var arrayIndex = arc.length
	arc.length = arc.length + numberOfArcSides
	for (var vertexIndex = 0; vertexIndex < numberOfArcSides; vertexIndex++) {
		rotate2DVector(centerFrom, rotator)
		if (zAddition != null) {
			centerFrom[2] += zAddition
		}
		var point = getAdditionArray(center, centerFrom, 3)
		add2D(point, getMultiplication2DScalar(right, dotProduct2D(right, centerFrom) * (radius - centerFromLength)))
		arc[arrayIndex++] = point
	}
	if (includeTo) {
		arc.push(toPoint)
	}
	return arc
}

function ellipseToRadius(registry, statement, toPoint, radius, numberOfSides, includeFrom, includeTo) {
	return ellipseFromToRadius(registry, statement, [undefined, undefined], toPoint, radius, numberOfSides, false, includeTo)
}

function floatByIDKey(registry, statement, id, key) {
	return parseFloat(getStatementByID(registry, statement, id).attributeMap.get(key))
}

function getParabolicFrom(fromPoint, toPoint, fromLevel, x, xMultiplier, zAddition) {
	fromPoint = fromPoint.slice(0)
	fromPoint[0] += x
	if (fromLevel) {
		fromPoint[1] += x * x * xMultiplier
	}
	else {
		x = toPoint[0] - x
		x *= x * xMultiplier
		fromPoint[1] += toPoint[1] - x
	}

	if (zAddition != undefined) {
		fromPoint[2] += zAddition * x
	}

	return fromPoint
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
		var titleIndex = null
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
	height4 = getValueDefault(height4, 4.0)
	numberOfSegments = Math.max(getValueDefault(numberOfSegments, 4), 1)
	overhangAngle = getValueDefault(overhangAngle, 45.0) * gRadiansPerDegree
	var insets = new Array(numberOfSegments + 1)
	var radius = height4 / Math.sin(overhangAngle)
	var radiusSquared = radius * radius
	for (var insetIndex = 0; insetIndex < insets.length; insetIndex++) {
		var y = insetIndex * height4 / numberOfSegments
		var down = height4 - y
		insets[insetIndex] = [radius - Math.sqrt(radiusSquared - down * down), y]
	}
	var xMultiplier = (insets[1][1] - insets[0][1]) * Math.tan(overhangAngle) / (insets[0][0] - insets[1][0])
	for (var inset of insets) {
		inset[0] *= xMultiplier
	}
	return insets
}

function intervalFromToBetween(from, toTen, along) {
	return intervalsFromToBetween(from, toTen, along)[0]
}

function intervalsFromQuantityIncrement(from, quantity, increments, includeFrom) {
	from = getValueDefault(from, 0.0)
	includeFrom = getValueTrue(includeFrom)
	increments = getValueDefault(increments, 1.0)
	increments = getArrayByValue(increments)
	quantity = getValueDefault(quantity, 11)
	if (quantity == 0.0) {
		noticeByList(['quantity is 0 in intervalsFromQuantityIncrement in function.', from, quantity, increments])
		return []
	}
	if (increments.length == 0) {
		noticeByList(['increments.length is 0 in intervalsFromQuantityIncrement in function.', from, quantity, increments])
		return [from]
	}
	if (quantity < 0.0) {
		reverseSigns(increments)
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

function intervalsFromToAlong(from, toTen, alongs, includeFrom, includeTo) {
	alongs = getValueDefault(alongs, 0.5)
	alongs = getArrayByValue(alongs)
	from = getValueDefault(from, 0.0)
	toTen = getValueDefault(toTen, 10.0)
	var difference = toTen - from
	includeFrom = getValueTrue(includeFrom)
	includeTo = getValueTrue(includeTo)
	var intervals = []
	if (includeFrom) {
		intervals.push(from)
	}
	var arrayIndex = intervals.length
	intervals.length = intervals.length + alongs.length
	for (var intervalIndex = 0; intervalIndex < alongs.length; intervalIndex++) {
		intervals[arrayIndex++] = from + alongs[intervalIndex] * difference
	}
	if (includeTo) {
		intervals.push(toTen)
	}
	return intervals
}

function intervalsFromToBetween(from, toTen, alongs) {
	return intervalsFromToAlong(from, toTen, alongs, false, false)
}

function intervalsFromToIncrement(from, toTen, increments, includeFrom, includeTo) {
	from = getValueDefault(from, 0.0)
	includeFrom = getValueTrue(includeFrom)
	includeTo = getValueTrue(includeTo)
	increments = getValueDefault(increments, 1.0)
	increments = getArrayByValue(increments)
	var totalLength = 0.0
	for (var increment of increments) {
		totalLength += increment
	}
	toTen = getValueDefault(toTen, 10.0)
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
	var intervals = []
	if (includeFrom) {
		intervals.push(from)
	}
	var arrayIndex = intervals.length
	intervals.length = intervals.length + numberUntilEnd
	for (var intervalIndex = 0; intervalIndex < numberUntilEnd; intervalIndex++) {
		for (var increment of increments) {
			from += increment
			intervals[arrayIndex++] = from
		}
	}
	if (includeTo) {
		intervals.push(toTen)
	}
	return intervals
}

function intervalsFromToQuantity(from, toTen, quantity, includeFrom, includeTo) {
	from = getValueDefault(from, 0.0)
	toTen = getValueDefault(toTen, 10.0)
	includeFrom = getValueTrue(includeFrom)
	includeTo = getValueTrue(includeTo)
	quantity = getValueDefault(quantity, 11)
	var one = 1.0
	if (quantity < 0.0) {
		one = -one
		quantity = -quantity
	}
	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		noticeByList(['quantityFloor is less than 1 in stepsFromQuantityIncrement in function.', from, quantity, increments])
		return []
	}
	var properFraction = quantity - quantityFloor
	var intervals = []
	if (includeFrom) {
		intervals.push(from)
		quantityFloor -= 1
	}
	quantity = quantityFloor
	if (properFraction > gClose) {
		quantityFloor++
		quantity += properFraction
	}
	if (!includeTo) {
		quantity += 1.0
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
	return intervals
}

function joinPoints(registry, statement, sourcePoints, numberOfJoins, from, until) {
	numberOfJoins = getValueDefault(numberOfJoins, 1)
	if (numberOfJoins < 1) {
		return []
	}
	if (getIsEmpty(sourcePoints)) {
		return []
	}
	until = getValueDefault(until, 3)
	from = getArrayByValue(from)
	from.length = until
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			var lastPoint = points[points.length - 1]
			from.length = lastPoint.length
			setUndefinedElementsToArray(from, lastPoint)
		}
	}
	setUndefinedElementsToValue(from, 0.0)
	var joinedPoints = []
	for (var joinCount = 0; joinCount < numberOfJoins; joinCount++) {
		pushArray(joinedPoints, addArrays(getArraysCopy(sourcePoints), from, until))
		from = joinedPoints[joinedPoints.length - 1]
	}
	return joinedPoints
}

function lattice2D(numberOfXCells, numberOfYCells, cellWidth, cellHeight) {
	numberOfXCells = getValueDefault(numberOfXCells, 2)
	numberOfYCells = getValueDefault(numberOfYCells, numberOfXCells)
	cellWidth = getValueDefault(cellWidth, 10)
	cellHeight = getValueDefault(cellHeight, cellWidth)
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
	polygon = getValueDefault(polygon, [[0.0, 0.0], [20.0, 0.0], [0.0, 20.0]])
	cellWidth = Math.abs(getValueDefault(cellWidth, 10))
	cellHeight = getValueDefault(cellHeight, cellWidth)
	if (cellHeight == 0.0 || cellWidth == 0.0) {
		return []
	}

	var halfCellHeight = cellHeight * 0.5
	var halfCellWidth = cellWidth * 0.5
	polygon = getArraysCopy(polygon)
	multiplyArraysByIndex(polygon, 1.0 / cellHeight, 1)
	addArraysByY(polygon, -0.5)
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

function mirrorJoin(registry, statement, center, direction, isSegment) {
	var variableMap = getVariableMapByStatement(statement)
	if (!variableMap.has('_points')) {
		noticeByList(['In mirrorJoin in function the variableMap does not have _points:', statement])
		return [[]]
	}

	var points = variableMap.get('_points')
	if (points.length < 2) {
		noticeByList(['In mirrorJoin in function _points is shorter than 2:', points, toX, toY, statement])
		return [[]]
	}

	var centerDirection = {center:center, direction:polarCounterclockwise(getValueDefault(direction, 90.0) * gRadiansPerDegree)}
	var mirrorStart = points.length - 1
	if (getValueFalse(isSegment)) {
		centerDirection = getCenterDirectionMirrorStart(mirrorStart, points)
		mirrorStart = centerDirection.mirrorStart
	}

	addMirrorPoints(centerDirection, mirrorStart, points)
	// must return something, which will be added to the points, so the last point is popped
	return [points.pop()]
}

function operation(registry, statement, symbol, elements, otherElements) {
	if (getIsEmpty(elements)) {
		return []
	}
	if (otherElements == null || otherElements == undefined) {
		return []
	}
	otherElements = getArrayByValue(otherElements)
	if (otherElements.length == 0) {
		return []
	}
	var symbol = getValueDefault(symbol, '+')
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
	toPoint = getArrayByValue(getValueDefault(toPoint, [10.0, 10.0]))
	fromPoint = getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	setUndefinedElementsToValue(toPoint, 0.0)
	includeFrom = getValueTrue(includeFrom)
	includeTo = getValueTrue(includeTo)
	var fromLevel = getValueTrue(fromLevel)
	horizontal = getValueTrue(horizontal)
	fromPoint = fromPoint.slice(0)
	if (!horizontal) {
		swapXYPoint(fromPoint)
		toPoint = toPoint.slice(0)
		swapXYPoint(toPoint)
	}

	var fromTo = getSubtractionArray(toPoint, fromPoint, 3)
	if (fromTo[0] == 0.0) {
		noticeByList(['fromTo[0] is 0 in parabolaFromTo in function.', fromPoint, toPoint, quantity])
		return []
	}

	var quantity = getValueDefault(quantity, 11)
	if (quantity < 0.0) {
		fromTo[0] = -fromTo[0]
		quantity = -quantity
	}

	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		noticeByList(['quantityFloor is less than 1 in parabolaFromTo in function.', fromPoint, toPoint, quantity])
		return []
	}

	var properFraction = quantity - quantityFloor
	var parabola = []
	if (includeFrom) {
		parabola.push(fromPoint)
		quantityFloor--
	}

	quantity = quantityFloor
	if (properFraction > gClose) {
		quantityFloor++
		quantity += properFraction
	}

	if (!includeTo) {
		quantity += 1.0
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
		swapXYPolygon(parabola)
	}

	return parabola
}

function parabolaToQuantity(registry, statement, toPoint, quantity, fromLevel, horizontal, includeFrom, includeTo) {
	var fromLength = 2
	if (Array.isArray(toPoint)) {
		fromLength = toPoint.length
	}
	return parabolaFromToQuantity(registry, statement, new Array(fromLength), toPoint, quantity, fromLevel, horizontal, false, includeTo)
}

function point(registry, statement, name, x, y, z) {
	var pointArgumentsLength = arguments.length - 3
	var point = new Array(pointArgumentsLength)
	for (var argumentIndex = 0; argumentIndex < pointArgumentsLength; argumentIndex++) {
		point[argumentIndex] = arguments[argumentIndex + 3]
	}
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(point, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(point, 0.0)
	variableMap.set(name, point.toString())
	return point
}

function pointsByID(registry, statement, id, x, y, z) {
	var points = getPointsHD(registry, getStatementByID(registry, statement, id))
	for (var point of points) {
		for (var argumentIndex = 0; argumentIndex < arguments.length - 3; argumentIndex++) {
			point[argumentIndex] += arguments[argumentIndex + 3]
		}
	}
	return points
}

function rightByID(registry, statement, id) {
	var boundingBox = getGroupBoundingBoxByArguments(id, registry, statement)
	if (boundingBox == null) {
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
	return getStatementByID(registry, statement, id).attributeMap.set(key, value)
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
		if (getIsEmpty(headers[columnIndex])) {
			headers[columnIndex] = 'Column_' + getBaseAlphabet(columnIndex)
		}
		statement.attributeMap.set(headers[columnIndex], row[columnIndex])
	}
}

function sineWaveXFromToCycles(xs, from, to, numberOfCycles, phase, numberOfSegments) {
	var from = getValueDefault(from, 0.0)
	var to = getValueDefault(to, 4.0)
	var numberOfCycles = getValueDefault(numberOfCycles, 1.0)
	var xs = getValueDefault(xs, intervalsFromToIncrement(from, to, 0.5 / numberOfCycles))
	var numberOfSegments = getValueDefault(numberOfSegments, 24)
	var sinPoints = new Array(numberOfCycles * numberOfSegments + 1)
	var wavelength = Math.abs(to - from) / numberOfCycles
	var oneOverWavelengthSegments = wavelength / numberOfSegments
	for (var xIndex = 0; xIndex < xs.length; xIndex++) {
		sinPoints[xIndex] = [xs[xIndex], sineYXFromToCycles(xs[xIndex], from, to, numberOfCycles, phase)]
	}
	return sinPoints
}

function sineYXFromToCycles(x, from, to, numberOfCycles, phase) {
	var x = getValueDefault(x, 0.0)
	var from = getValueDefault(from, 0.0)
	var to = getValueDefault(to, 4.0)
	var numberOfCycles = getValueDefault(numberOfCycles, 1.0)
	var phase = getValueDefault(phase, 0.0) * gRadiansPerDegree
	var wavelength = Math.abs(to - from) / numberOfCycles
	return Math.sin((x + from) * gDoublePi / wavelength + phase)
}

function spiralBeforeFromTo(registry, statement, before, fromPoint, toPoint, numberOfSides, includeBefore, includeFrom, includeTo) {
	before = getArrayByValue(before)
	before.length = 2
	toPoint = getArrayByValue(getValueDefault(toPoint, 10.0))
	fromPoint = getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 1) {
			setUndefinedElementsToArray(before, points[points.length - 2])
		}
		if (points.length > 0) {
			setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}
	before = [getValueDefault(before[0], -10.0), getValueDefault(before[1], 0.0)]
	setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	toPoint[0] = getValueDefault(toPoint[0], 10.0)
	setUndefinedElementsToValue(toPoint, 0.0)
	includeBefore = getValueTrue(includeBefore)
	includeFrom = getValueTrue(includeFrom)
	includeTo = getValueTrue(includeTo)
	var beforeFrom = subtract2D(fromPoint.slice(0), before)
	var beforeFromLength = length2D(beforeFrom)
	var fromTo = subtract2D(toPoint.slice(0), fromPoint)
	var fromToLength = length2D(fromTo)
	var arc = []
	if (includeBefore) {
		arc.push(before)
	}
	if (beforeFromLength == 0.0 || fromToLength == 0.0) {
		return arc
	}
	divide2DScalar(beforeFrom, beforeFromLength)
	divide2DScalar(fromTo, fromToLength)
	var angle = 4.0 * Math.asin(0.5 * distance2D(beforeFrom, fromTo)) * gDegreesPerRadian
	if (crossProduct2D(beforeFrom, fromTo) < 0.0) {
		angle = -angle
	}
	pushArray(arc, spiralFromToAngle(registry, statement, fromPoint, toPoint, angle, numberOfSides, includeFrom, includeTo))
	return arc
}

function spiralCenterRadius(center, radius, fromAngle, toAngle, numberOfSides, toZ, includeFrom, includeTo) {
	center = getArrayByElements(center, 2)
	radius = getValueDefault(radius, 10.0)
	fromAngle = getValueDefault(fromAngle, 0.0) * gRadiansPerDegree
	toAngle = getValueDefault(toAngle, 360.0) * gRadiansPerDegree
	includeFrom = getValueTrue(includeFrom)
	includeTo = getValueTrue(includeTo)
	var numberOfSides = Math.max(getValueDefault(numberOfSides, 24), 3)
	var angleDifference = toAngle - fromAngle
	var numberOfArcSides = Math.ceil(numberOfSides * Math.abs(angleDifference) / gDoublePi - gClose)
	var rotator = polarCounterclockwise(angleDifference / numberOfArcSides)
	var centerFrom = polarRadius(fromAngle, radius)
	var zAddition = null
	if (center.length > 2) {
		zAddition = (getValueDefault(toZ, 0.0) - center[2]) / numberOfArcSides
		centerFrom.push(0.0)
	}
	if (!includeFrom) {
		numberOfArcSides--
		rotate2DVector(centerFrom, rotator)
		if (zAddition != null) {
			centerFrom[2] += zAddition
		}
	}
	numberOfArcSides += 1 * includeTo
	var arc = new Array(numberOfArcSides)
	for (var pointIndex = 0; pointIndex < numberOfArcSides; pointIndex++) {
		arc[pointIndex] = getAdditionArray(center, centerFrom)
		rotate2DVector(centerFrom, rotator)
		if (zAddition != null) {
			centerFrom[2] += zAddition
		}
	}
	return arc
}

function spiralFromToAngle(registry, statement, fromPoint, toPoint, angle, numberOfSides, includeFrom, includeTo) {
	toPoint = getArrayByValue(getValueDefault(toPoint, 10.0))
	fromPoint = getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	setUndefinedElementsToValue(toPoint, 0.0)
	includeFrom = getValueTrue(includeFrom)
	includeTo = getValueTrue(includeTo)
	var fromTo = subtract2D(toPoint.slice(0), fromPoint)
	var fromToLength = length2D(fromTo)
	var arc = []
	if (includeFrom) {
		arc.push(fromPoint)
	}
	if (fromToLength == 0.0) {
		return arc
	}
	var center = multiply2DScalar(add2D(fromPoint.slice(0), toPoint), 0.5)
	var numberOfSides = getValueDefault(numberOfSides, 24)
	var halfFromToLength = 0.5 * fromToLength
	var radius = halfFromToLength
	if (angle == undefined) {
		angle = Math.PI
	}
	else {
		angle *= gRadiansPerDegree
		if (Math.abs(angle) < gClose) {
			return [fromPoint, toPoint]
		}
		var perpendicularAngle = 0.5 * Math.PI - Math.abs(0.5 * angle)
		if (angle < 0.0) {
			perpendicularAngle = -perpendicularAngle
		}
		var right = [-fromTo[1], fromTo[0]]
		add2D(center, multiply2DScalar(right, 0.5 * Math.tan(perpendicularAngle)))
		radius = Math.sqrt(halfFromToLength * halfFromToLength + lengthSquared2D(right))
	}
	var centerFrom = getSubtraction2D(fromPoint, center)
	var centerFromLength = length2D(centerFrom)
	multiply2DScalar(centerFrom, radius / centerFromLength)
	var numberOfArcSides = Math.ceil(numberOfSides * Math.abs(angle) / gDoublePi - gClose)
	var zAddition = null
	if (fromPoint.length > 2) {
		zAddition = (toPoint[2] - fromPoint[2]) / numberOfArcSides
		centerFrom.push(0.0)
	}
	var rotator = polarCounterclockwise(angle / numberOfArcSides)
	numberOfArcSides -= 1
	var arrayIndex = arc.length
	arc.length = arc.length + numberOfArcSides
	for (var pointIndex = 0; pointIndex < numberOfArcSides; pointIndex++) {
		rotate2DVector(centerFrom, rotator)
		if (zAddition != null) {
			centerFrom[2] += zAddition
		}
		arc[arrayIndex++] = getAdditionArray(center, centerFrom)
	}
	if (includeTo) {
		arc.push(toPoint)
	}
	return arc
}

function spiralFromToRadius(registry, statement, fromPoint, toPoint, radius, counterclockwise, numberOfSides, includeFrom, includeTo) {
	toPoint = getArrayByValue(getValueDefault(toPoint, 10.0))
	fromPoint = getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	setUndefinedElementsToValue(toPoint, 0.0)
	includeFrom = getValueTrue(includeFrom)
	includeTo = getValueTrue(includeTo)
	var counterclockwise = getValueTrue(counterclockwise)
	var fromTo = subtract2D(toPoint.slice(0), fromPoint)
	var fromToLength = length2D(fromTo)
	var arc = []
	if (includeFrom) {
		arc.push(fromPoint)
	}
	if (fromToLength == 0.0) {
		noticeByList(['fromToLength is 0 in spiralFromToRadius in function.', fromPoint, toPoint, radius])
		return arc
	}
	var center = multiply2DScalar(add2D(fromPoint.slice(0), toPoint), 0.5)
	var numberOfSides = getValueDefault(numberOfSides, 24)
	var halfFromToLength = 0.5 * fromToLength
	radius = getValueDefault(radius, halfFromToLength)
	if (Math.abs(radius) < halfFromToLength) {
		return arc
	}
	var right = [fromTo[1], -fromTo[0]]
	if (counterclockwise != radius > 0.0) {
		fromToLength = -fromToLength
	}
	multiply2DScalar(right, Math.sqrt(radius * radius - halfFromToLength * halfFromToLength) / fromToLength)
	add2D(center, right)
	var centerFrom = normalize2D(getSubtraction2D(fromPoint, center))
	var centerTo = normalize2D(getSubtraction2D(toPoint, center))
	var angle = 2.0 * Math.asin(0.5 * distance2D(centerFrom, centerTo))
	if (radius < 0.0) {
		angle = gDoublePi - angle
	}
	var numberOfArcSides = Math.ceil(numberOfSides * angle / gDoublePi - gClose)
	if (counterclockwise) {
		angle = -angle
	}
	var zAddition = null
	if (fromPoint.length > 2) {
		zAddition = (toPoint[2] - fromPoint[2]) / numberOfArcSides
		centerFrom.push(0.0)
	}
	var rotator = polarCounterclockwise(angle / numberOfArcSides)
	multiply2DScalar(centerFrom, Math.abs(radius))
	numberOfArcSides -= 1
	var arrayIndex = arc.length
	arc.length = arc.length + numberOfArcSides
	for (var pointIndex = 0; pointIndex < numberOfArcSides; pointIndex++) {
		rotate2DVector(centerFrom, rotator)
		if (zAddition != null) {
			centerFrom[2] += zAddition
		}
		arc[arrayIndex++] = getAdditionArray(center, centerFrom)
	}
	if (includeTo) {
		arc.push(toPoint)
	}
	return arc
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
	fromPoint = getArrayByValue(fromPoint)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint = getArrayByValue(getValueDefault(toPoint, 10.0))
	toPoint.length = fromPoint.length
	setUndefinedElementsToValue(toPoint, 0.0)
	var distance = getValueDefault(distance, 1.0)
	var fromTo = getSubtractionArray(toPoint, fromPoint)
	var fromToLength = length2D(fromTo)
	if (fromToLength == 0.0) {
		return fromPoint
	}

	return getAddition2D(fromPoint, multiply2DScalar(fromTo, distance / fromToLength))
}

function stepsFromQuantityIncrement(registry, statement, fromPoint, quantity, increments, includeFrom) {
	fromPoint = getArrayByValue(fromPoint)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(fromPoint, 0.0)
	includeFrom = getValueTrue(includeFrom)
	increments = getValueDefault(increments, [1.0, 0.0])
	increments = getArrayByValue(increments)
	quantity = getValueDefault(quantity, 11)
	if (increments.length == 0) {
		noticeByList(['increments.length is 0 in stepsFromQuantityIncrement in function.', fromPoint, quantity, increments])
		return [fromPoint]
	}
	if (getIsEmpty(increments[0])) {
		noticeByList(['increments zero is empty in stepsFromQuantityIncrement in function.', fromPoint, quantity, increments])
		return [fromPoint]
	}
	if (!Array.isArray(increments[0])) {
		increments = [increments]
	}
	if (quantity < 0.0) {
		for (var parameters of increments) {
			reverseSigns(parameters)
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
		addArray(fromPoint, increment)
		steps[arrayIndex++] = fromPoint.slice(0)
	}
	if (properFraction > gClose) {
		steps[steps.length - 1] = addArray(steps[steps.length - 2].slice(0), multiplyArrayScalar(increment, properFraction))
	}
	return steps
}

function stepsFromToAlong(registry, statement, fromPoint, toPoint, alongs, includeFrom, includeTo) {
	alongs = getValueDefault(alongs, 0.5)
	alongs = getArrayByValue(alongs)
	fromPoint = getArrayByValue(fromPoint)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint = getArrayByValue(getValueDefault(toPoint, 10.0))
	toPoint.length = fromPoint.length
	setUndefinedElementsToValue(toPoint, 0.0)
	var fromTo = getSubtractionArray(toPoint, fromPoint)
	includeFrom = getValueTrue(includeFrom)
	includeTo = getValueTrue(includeTo)
	var steps = []
	if (includeFrom) {
		steps.push(fromPoint)
	}
	var arrayIndex = steps.length
	steps.length = steps.length + alongs.length
	for (var stepIndex = 0; stepIndex < alongs.length; stepIndex++) {
		steps[arrayIndex++] = addArray(multiplyArrayScalar(fromTo.slice(0), alongs[stepIndex]), fromPoint)
	}
	if (includeTo) {
		steps.push(toPoint)
	}
	return steps
}

function stepsFromToBetween(registry, statement, fromPoint, toPoint, alongs) {
	return stepsFromToAlong(registry, statement, fromPoint, toPoint, alongs, false, false)
}

function stepsFromToQuantity(registry, statement, fromPoint, toPoint, quantity, includeFrom, includeTo) {
	fromPoint = getArrayByValue(fromPoint)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint = getArrayByValue(getValueDefault(toPoint, 10.0))
	toPoint.length = fromPoint.length
	setUndefinedElementsToValue(toPoint, 0.0)
	includeFrom = getValueTrue(includeFrom)
	includeTo = getValueTrue(includeTo)
	quantity = getValueDefault(quantity, 11)
	var one = 1.0
	if (quantity < 0.0) {
		one = -one
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

	quantity = quantityFloor
	if (properFraction > gClose) {
		quantityFloor++
		quantity += properFraction
	}

	if (!includeTo) {
		quantity += 1.0
	}

	var increment = multiplyArrayScalar(getSubtractionArray(toPoint, fromPoint), one / quantity)
	var arrayIndex = steps.length
	steps.length = steps.length + quantityFloor
	for (var count = 0; count < quantityFloor; count++) {
		addArray(fromPoint, increment)
		steps[arrayIndex++] = fromPoint.slice(0)
	}

	if (properFraction > gClose) {
		steps[steps.length - 1] = addArray(steps[steps.length - 2].slice(0), multiplyArrayScalar(increment, properFraction))
	}

	return steps
}

function stepsQuantityIncrement(registry, statement, quantity, increments) {
	increments = getValueDefault(increments, [1.0, 0.0])
	increments = getArrayByValue(increments)
	if (increments.length == 0) {
		noticeByList(['increments.length is 0 in stepsQuantityIncrement in function.', fromPoint, quantity, increments])
		return []
	}

	if (getIsEmpty(increments[0])) {
		noticeByList(['increments zero is empty in stepsQuantityIncrement in function.', fromPoint, quantity, increments])
		return []
	}

	if (!Array.isArray(increments[0])) {
		increments = [increments]
	}

	var fromPoint = new Array(increments[0].length)
	return stepsFromQuantityIncrement(registry, statement, fromPoint, getValueDefault(quantity, 10), increments, false)
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

function stringLength(word) {
	return word.length
}

function topByID(registry, statement, id) {
	var boundingBox = getGroupBoundingBoxByArguments(id, registry, statement)
	if (boundingBox == null) {
		return 0.0
	}
	return boundingBox[1][1]
}

function zigzag(polyline, radiusMultiplier, numberOfSides) {
	if (polyline.length < 3) {
		return polyline
	}
	var numberOfSides = getValueDefault(numberOfSides, 24)
	var radiusMultiplier = getValueDefault(radiusMultiplier, 0.2)
	var centerIntersections = new Array(polyline.length)
	centerIntersections[0] = {intersection:polyline[0]}
	centerIntersections[polyline.length - 1] = {intersection:polyline[polyline.length - 1]}
	var zigzagPolyline = [polyline[0]]
	for (var vertexIndex = 1; vertexIndex < polyline.length - 1; vertexIndex++) {
		var beginPoint = polyline[vertexIndex - 1]
		var centerPoint = polyline[vertexIndex]
		var centerBegin = getSubtraction2D(beginPoint, centerPoint)
		var centerBeginLength = length2D(centerBegin)
		var endPoint = polyline[vertexIndex + 1]
		var centerEnd = getSubtraction2D(endPoint, centerPoint)
		var centerEndLength = length2D(centerEnd)
		var intersection = getMultiplication2DScalar(centerBegin, 0.5)
		add2D(intersection, centerPoint)
		divide2DScalar(centerBegin, centerBeginLength)
		divide2DScalar(centerEnd, centerEndLength)
		centerIntersections[vertexIndex] = {
		centerBegin:centerBegin, centerBeginLength:centerBeginLength,
		centerEnd:centerEnd, centerEndLength:centerEndLength, centerPoint:centerPoint, intersection:intersection}
	}
	for (var vertexIndex = 1; vertexIndex < polyline.length - 1; vertexIndex++) {
		var centerIntersection = centerIntersections[vertexIndex]
		var centerPoint = centerIntersection.centerPoint
		var middleBegin = getAddition2D(centerIntersection.centerBegin, centerIntersection.centerEnd)
		normalize2D(middleBegin)
		var beginEndDistance = Math.min(1.0, distance2D(centerIntersection.centerBegin, centerIntersection.centerEnd))
		beginEndDistance *= radiusMultiplier
		var right = [middleBegin[1], -middleBegin[0]]
		var dotProduct = dotProduct2D(right, centerIntersection.centerBegin)
		if (dotProduct < 0.0) {
			multiply2DScalar(right, -1)
		}
		var left = getMultiplication2DScalar(right, -1.0)
		multiply2DScalar(left, centerIntersection.centerEndLength * beginEndDistance)
		multiply2DScalar(right, centerIntersection.centerBeginLength * beginEndDistance)
		var rightPoint = getAddition2D(centerPoint, right)
		var rightBefore = getSubtraction2D(centerIntersection.intersection, rightPoint)
		var leftPoint = getAddition2D(centerPoint, left)
		var leftAfter = getSubtraction2D(centerIntersections[vertexIndex + 1].intersection, leftPoint)
		var quarterNumberOfSides = Math.ceil(numberOfSides * 0.25)
		for (var pointIndex = quarterNumberOfSides - 1; pointIndex > 0; pointIndex--) {
			var along = pointIndex / quarterNumberOfSides
			var combinedPoint = getAddition2D(rightPoint, getMultiplication2DScalar(rightBefore, along))
			var alongRight = getAddition2D(centerPoint, getMultiplication2DScalar(right, along))
			add2D(multiply2DScalar(combinedPoint, along), multiply2DScalar(alongRight, 1.0 - along))
			zigzagPolyline.push(combinedPoint)
		}
		zigzagPolyline.push(centerPoint)
		for (var pointIndex = 1; pointIndex < quarterNumberOfSides; pointIndex++) {
			var along = pointIndex / quarterNumberOfSides
			var combinedPoint = getAddition2D(leftPoint, getMultiplication2DScalar(leftAfter, along))
			var alongLeft = getAddition2D(centerPoint, getMultiplication2DScalar(left, along))
			add2D(multiply2DScalar(combinedPoint, along), multiply2DScalar(alongLeft, 1.0 - along))
			zigzagPolyline.push(combinedPoint)
		}
	}
	zigzagPolyline.push(polyline[polyline.length - 1])
	return zigzagPolyline
}

function zoomInterpolation(x, polyline, point, center, arrayLength) {
	center = getArrayByElements(center, arrayLength)
	point = getArrayByElements(point, arrayLength)
	var centerPoint = getSubtractionArray(point, center, arrayLength)
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
