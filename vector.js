//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var Vector = {
add2D: function(elements, adder2D) {
	elements[0] += adder2D[0]
	elements[1] += adder2D[1]
	return elements
},

add2D_Check: function(elements, adder2D) {
	return Vector.add2D(arrayKit.getArrayByElements(elements, 2), arrayKit.getArrayByElements(adder2D, 2))
},

add2DAlongAxis: function(elements, adder2D) {
	if (Math.abs(adder2D[0]) > Math.abs(adder2D[1])) {
		elements[0] += adder2D[0]
	}
	else {
		elements[1] += adder2D[1]
	}
},

add2DAlongAxis_Check: function(elements, adder2D) {
	return Vector.add2DAlongAxis(arrayKit.getArrayByElements(elements, 2), arrayKit.getArrayByElements(adder2D, 2))
},

add2DArrays: function(arrays, adder2D) {
	for (var array of arrays) {
		Vector.add2Ds(array, adder2D)
	}

	return arrays
},

add2DArrays_Check: function(arrays, adder2D) {
	arrays = arrayKit.getArrayByElements(arrays)
	for (var array of arrays) {
		VectorCheck.add2Ds(array, adder2D)
	}

	return arrays
},

add2Ds: function(elements, adder2D) {
	for (var element of elements) {
		Vector.add2D(element, adder2D)
	}

	return elements
},

add2Ds_Check: function(elements, adder2D) {
	elements = arrayKit.getArrayByElements(elements, 2)
	for (var element of elements) {
		VectorCheck.add2D(element, adder2D)
	}

	return elements
},

add3D: function(elements, adder3D) {
	elements[0] += adder3D[0]
	elements[1] += adder3D[1]
	elements[2] += adder3D[2]
	return elements
},

add3D_Check: function(elements, adder3D) {
	return Vector.add3D(arrayKit.getArrayByElements(elements, 3), arrayKit.getArrayByElements(adder3D, 3))
},

add3Ds: function(elements, adder3D) {
	for (var element of elements) {
		Vector.add3D(element, adder3D)
	}

	return elements
},

add3Ds_Check: function(elements, adder3D) {
	elements = arrayKit.getArrayByElements(elements, 3)
	for (var element of elements) {
		VectorCheck.add3D(element, adder3D)
	}

	return elements
},

addArray: function(elements, adders, until) {
	var minimumLength = Vector.getMinimumLength(elements, adders, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] += adders[elementIndex]
	}

	return elements
},

addArray_Check: function(elements, adders, until) {
	return Vector.addArray(arrayKit.getArrayByElements(elements), arrayKit.getArrayByElements(adders), until)
},

alongsFromToDistance: function(from = [0.0, 0.0], to = [10.0, 0.0], fromDistances = [], toDistances = []) {
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
},

arrayAtIndex: function(elements, index) {
	var outputs = new Array(elements.length)
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		outputs[elementIndex] = elements[elementIndex][index]
	}

	return outputs
},

arrayAtIndex_Check: function(elements, index) {
	if (!Array.isArray(elements)) {
		return elements
	}

	var outputs = new Array(elements.length)
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		var element = elements[elementIndex]
		if (Array.isArray(element)) {
			if (element.length == 0) {
				outputs[elementIndex] = undefined
			}
			else {
				outputs[elementIndex] = element[(index + element.length) % element.length]
			}
		}
		else {
			outputs[elementIndex] = undefined
		}
	}

	return outputs
},

bracket: function(center = 0.0, side = 1.0) {
	return [center - side, center + side]
},

//cross(A, B) = [ a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1 ]
crossProduct: function(a, b) {
	return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
},

crossProduct_Check: function(a, b) {
	return Vector.crossProduct(arrayKit.getArrayByElements(a, 3), arrayKit.getArrayByElements(b, 3))
},

crossProduct2D: function(a, b) {
	return a[0] * b[1] - a[1] * b[0]
},

crossProduct2D_Check: function(a, b) {
	return Vector.crossProduct2D(arrayKit.getArrayByElements(a, 2), arrayKit.getArrayByElements(b, 2))
},

distance2D: function(elements, others) {
	return Math.sqrt(Vector.distanceSquared2D(elements, others))
},

distance2D_Check: function(elements, others) {
	return Vector.distance2D(arrayKit.getArrayByElements(elements, 2), arrayKit.getArrayByElements(others, 2))
},

distanceSquared2D: function(elements, others) {
	return Vector.lengthSquared2D(Vector.getSubtraction2D(elements, others))
},

distanceSquared2D_Check: function(elements, others) {
	return Vector.distanceSquared2D(arrayKit.getArrayByElements(elements, 2), arrayKit.getArrayByElements(others, 2))
},

distance3D: function(elements, others) {
	return Math.sqrt(Vector.distanceSquared3D(elements, others))
},

distance3D_Check: function(elements, others) {
	return Vector.distance3D(arrayKit.getArrayByElements(elements, 3), arrayKit.getArrayByElements(others, 3))
},

distanceSquared3D: function(elements, others) {
	return Vector.lengthSquared3D(Vector.getSubtraction3D(elements, others))
},

distanceSquared3D_Check: function(elements, others) {
	return Vector.distanceSquared3D(arrayKit.getArrayByElements(elements, 3), arrayKit.getArrayByElements(others, 3))
},

distanceArray: function(elements, others, until) {
	return Math.sqrt(Vector.distanceSquaredArray(elements, others, until))
},

distanceArray_Check: function(elements, others, until) {
	return Vector.distanceArray(arrayKit.getArrayByElements(elements), arrayKit.getArrayByElements(others), until)
},

distanceSquaredArray: function(elements, others, until) {
	var distanceSquared = 0.0
	var minimumLength = Vector.getMinimumLength(elements, others, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		var distance = elements[elementIndex] - others[elementIndex]
		distanceSquared += distance * distance
	}

	return distanceSquared
},

distanceSquaredArray_Check: function(elements, others, until) {
	return Vector.distanceSquaredArray(arrayKit.getArrayByElements(elements), arrayKit.getArrayByElements(others), until)
},

divide2D: function(elements, divisor2D) {
	elements[0] /= divisor2D[0]
	elements[1] /= divisor2D[1]
	return elements
},

divide2D_Check: function(elements, divisor2D) {
	return Vector.divide2D(arrayKit.getArrayByElements(elements, 2), arrayKit.getArrayByElements(divisor2D, 2, 1.0))
},

divide2DScalar: function(elements, divisorScalar) {
	elements[0] /= divisorScalar
	elements[1] /= divisorScalar
	return elements
},

divide2DScalar_Check: function(elements, divisorScalar) {
	return Vector.divide2DScalar(arrayKit.getArrayByElements(elements, 2), Value.getValueDefault(divisorScalar, 1.0))
},

divide3D: function(elements, divisor3D) {
	elements[0] /= divisor3D[0]
	elements[1] /= divisor3D[1]
	elements[2] /= divisor3D[2]
	return elements
},

divide3D_Check: function(elements, divisor3D) {
	return Vector.divide3D(arrayKit.getArrayByElements(elements, 3), arrayKit.getArrayByElements(divisor3D, 3, 1.0))
},

divide3DScalar: function(elements, divisorScalar) {
	elements[0] /= divisorScalar
	elements[1] /= divisorScalar
	elements[2] /= divisorScalar
	return elements
},

divide3DScalar_Check: function(elements, divisorScalar) {
	return Vector.divide3DScalar(arrayKit.getArrayByElements(elements, 3), Value.getValueDefault(divisorScalar, 1.0))
},

divideArray: function(elements, divisors, until) {
	var minimumLength = Vector.getMinimumLength(elements, divisors, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] /= divisors[elementIndex]
	}

	return elements
},

divideArray_Check: function(elements, divisors, until) {
	return Vector.divideArray(arrayKit.getArrayByElements(elements), arrayKit.getArrayByElements(divisors, undefined, 1.0), until)
},

divideArrayScalar: function(elements, divisorScalar) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		elements[elementIndex] /= divisorScalar
	}

	return elements
},

divideArrayScalar_Check: function(elements, divisorScalar) {
	return Vector.function(arrayKit.getArrayByElements(elements), Value.getValueDefault(divisorScalar, 1.0))
},

dotProduct2D: function(elements, others) {
	return elements[0] * others[0] + elements[1] * others[1]
},

dotProduct2D_Check: function(elements, others) {
	return Vector.dotProduct2D(arrayKit.getArrayByElements(elements, 2), arrayKit.getArrayByElements(others, 2))
},

dotProduct3D: function(elements, others) {
	return elements[0] * others[0] + elements[1] * others[1] + elements[2] * others[2]
},

dotProduct3D_Check: function(elements, others) {
	return Vector.dotProduct3D(arrayKit.getArrayByElements(elements, 3), arrayKit.getArrayByElements(others, 3))
},

dotProductArray: function(elements, others, until) {
	var dotProduct = 0.0
	var minimumLength = Vector.getMinimumLength(elements, others, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		dotProduct += elements[elementIndex] * others[elementIndex]
	}

	return dotProduct
},

dotProductArray_Check: function(elements, others, until) {
	return Vector.dotProductArray(arrayKit.getArrayByElements(elements), arrayKit.getArrayByElements(others), until)
},

equal2D: function(elements, others) {
	return elements[0] == others[0] && elements[1] == others[1]
},

equal2D_Check: function(elements, others) {
	return Vector.equal2D(arrayKit.getArrayByElements(elements, 2), arrayKit.getArrayByElements(others, 2))
},

equal3D: function(elements, others) {
	return elements[0] == others[0] && elements[1] == others[1] && elements[2] == others[2]
},

equal3D_Check: function(elements, others) {
	return Vector.equal2D(arrayKit.getArrayByElements(elements, 3), arrayKit.getArrayByElements(others, 3))
},

equalArray: function(elements, others, until) {
	var minimumLength = Vector.getMinimumLength(elements, others, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		if (elements[elementIndex] != others[elementIndex]) {
			return false
		}
	}

	return true
},

equalArray_Check: function(elements, others, until) {
	return Vector.equalArray(arrayKit.getArrayByElements(elements), arrayKit.getArrayByElements(others), until)
},

getAddition2D: function(elements, adder2D) {
	return Vector.add2D(elements.slice(0, 2), adder2D)
},

getAddition2D_Check: function(elements, adder2D) {
	return Vector.getAddition2D(arrayKit.getArrayByElements(elements, 2), arrayKit.getArrayByElements(adder2D, 2))
},

getAddition2Ds: function(elements, adder2D) {
	var addition2Ds = new Array(elements.length)
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		addition2Ds[elementIndex] = Vector.getAddition2D(elements[elementIndex], adder2D)
	}

	return addition2Ds
},

getAddition2Ds_Check: function(elements, adder2D) {
	//unfinished, needs elements arrays check
	return Vector.getAddition2Ds(elements, arrayKit.getArrayByElements(adder2D, 2))
},

getAddition3D: function(elements, adder3D) {
	return Vector.add3D(elements.slice(0, 3), adder3D)
},

getAddition3D_Check: function(elements, adder3D) {
	return Vector.getAddition3D(arrayKit.getArrayByElements(elements, 3), arrayKit.getArrayByElements(adder3D, 3))
},

getAdditionArray: function(elements, adders, until) {
	return Vector.addArray(elements.slice(0), adders, until)
},

getAdditionArray_Check: function(elements, adders, until) {
	return Vector.getAdditionArray(arrayKit.getArrayByElements(elements), arrayKit.getArrayByElements(adders), until)
},

getAlongFromTo2D: function(along, from, to) {
	return Vector.add2D(Vector.getMultiplication2DScalar(to, along), Vector.getMultiplication2DScalar(from, (1.0 - along)))
},

getAlongFromTo2D_Check: function(along = 0.0, from, to) {
	return Vector.getAlongFromTo2D(along, arrayKit.getArrayByElements(from, 2), arrayKit.getArrayByElements(to, 2))
},

// unfinished, do vectorcheck
getDistanceFromTo2D: function(distance, from2D, to2D) {
	return Vector.add2D(Vector.multiply2DScalar(Vector.getSubtraction2D(to2D, from2D), distance), from2D)
},

// unfinished, do vectorcheck
getDistanceFromTo3D: function(distance, from3D, to3D) {
	return Vector.add3D(Vector.multiply3DScalar(Vector.getSubtraction3D(to3D, from3D), distance), from3D)
},

// unfinished, do vectorcheck
getDistanceFromToArray: function(distance, froms, tos, until) {
	return Vector.addArray(Vector.multiplyArrayScalar(Vector.getSubtractionArray(tos, froms, until), distance, until), froms, until)
},

getDivision2D: function(elements, divisor2D) {
	return Vector.divide2D(elements.slice(0, 2), divisor2D)
},

getDivision2D_Check: function(elements, divisor2D) {
	return Vector.getDivision2D(arrayKit.getArrayByElements(elements, 2), arrayKit.getArrayByElements(divisor2D, 2, 1.0))
},

getDivision2DScalar: function(elements, divisorScalar) {
	return Vector.divide2DScalar(elements.slice(0, 2), divisorScalar)
},

getDivision2DScalar_Check: function(elements, divisorScalar) {
	return getDivision2DScalar(arrayKit.getArrayByElements(elements, 2), Value.getValueDefault(divisorScalar, 1.0))
},

getDivision3D: function(elements, divisor3D) {
	return Vector.divide3D(elements.slice(0, 3), divisor3D)
},

getDivision3D_Check: function(elements, divisor3D) {
	return getDivision3D(arrayKit.getArrayByElements(elements, 3), arrayKit.getArrayByElements(divisor3D, 3, 1.0))
},

getDivision3DScalar: function(elements, divisorScalar) {
	return Vector.divide3DScalar(elements.slice(0, 3), divisorScalar)
},

getDivision3DScalar_Check: function(elements, divisorScalar) {
	return Vector.getDivision3DScalar(arrayKit.getArrayByElements(elements, 3), Value.getValueDefault(divisorScalar, 1.0))
},

getDivisionArray: function(elements, divisors) {
	return Vector.divideArray(elements.slice(0), divisors)
},

getDivisionArray_Check: function(elements, divisors) {
	return Vector.getDivisionArray(arrayKit.getArrayByElements(elements), arrayKit.getArrayByElements(divisors, undefined, 1.0))
},

getDivisionArrayScalar: function(elements, divisorScalar) {
	return Vector.function(elements.slice(0), divisorScalar)
},

getDivisionArrayScalar_Check: function(elements, divisorScalar) {
	return Vector.function(arrayKit.getArrayByElements(elements), Value.getValueDefault(divisorScalar, 1.0))
},

getMinimumLength: function(elements, others, until) {
	var minimumLength = Math.min(elements.length, others.length)
	if (until == undefined) {
		return minimumLength
	}

	return Math.min(minimumLength, until)
},

getMultiplication2D: function(elements, multiplier2D) {
	return Vector.multiply2D(elements.slice(0, 2), multiplier2D)
},

getMultiplication2D_Check: function(elements, multiplier2D) {
	return Vector.getMultiplication2D(arrayKit.getArrayByElements(elements, 2), arrayKit.getArrayByElements(multiplier2D, 2))
},

getMultiplication2DScalar: function(elements, multiplierScalar) {
	return Vector.multiply2DScalar(elements.slice(0, 2), multiplierScalar)
},

getMultiplication2DScalar_Check: function(elements, multiplierScalar) {
	return Vector.getMultiplication2DScalar(arrayKit.getArrayByElements(elements, 2), Value.getValueDefault(multiplierScalar, 0.0))
},

getMultiplication2DsScalar: function(elements, multiplierScalar) {
	return multiply2DsScalar(arrayKit.getArraysCopy(elements), multiplierScalar)
},

getMultiplication3D: function(elements, multiplier3D) {
	return Vector.multiply3D(elements.slice(0, 3), multiplier3D)
},

getMultiplication3D_Check: function(elements, multiplier3D) {
	return Vector.getMultiplication3D(arrayKit.getArrayByElements(elements, 3), arrayKit.getArrayByElements(multiplier3D, 3))
},

getMultiplication3DScalar: function(elements, multiplierScalar) {
	return Vector.multiply3DScalar(elements.slice(0, 3), multiplierScalar)
},

getMultiplication3DScalar_Check: function(elements, multiplierScalar) {
	return Vector.getMultiplication3DScalar(arrayKit.getArrayByElements(elements, 3), Value.getValueDefault(multiplierScalar, 0.0))
},

getMultiplicationArray: function(elements, multipliers) {
	return Vector.multiplyArray(elements.slice(0), multipliers)
},

getMultiplicationArray_Check: function(elements, multipliers) {
	return Vector.getMultiplicationArray(arrayKit.getArrayByElements(elements), arrayKit.getArrayByElements(multipliers))
},

getMultiplicationArrayScalar: function(elements, multiplierScalar) {
	return Vector.multiplyArrayScalar(elements.slice(0), multiplierScalar)
},

getMultiplicationArrayScalar_Check: function(elements, multiplierScalar) {
	return Vector.multiplyArrayScalar(arrayKit.getArrayByElements(elements), Value.getValueDefault(multiplierScalar, 0.0))
},

getRotation2DAngle: function(point, angle) {
	return Vector.rotate2DVector(arrayKit.getArrayByElements(point.slice(0), 2), Vector.polarCounterclockwise(angle))
},

getRotation2DAngle_Check: function(point, angle) {
	return Vector.getRotation2DAngle(arrayKit.getArrayByElements(point, 2), polar(angle))
},

getRotation2DVector: function(point, vector) {
	return Vector.rotate2DVector(point.slice(0, 2), vector)
},

getRotation2DVector_Check: function(point, vector) {
	return Vector.getRotation2DVector(arrayKit.getArrayByElements(point, 2), arrayKit.getArrayByElements(vector, 2))
},

getRotation2DX: function(point, vector) {
	return point[0] * vector[0] - point[1] * vector[1]
},

getRotation2DX_Check: function(point, vector) {
	return Vector.getRotation2DX(arrayKit.getArrayByElements(point, 2), arrayKit.getArrayByElements(vector, 2))
},

getRotation2DY: function(point, vector) {
	return point[0] * vector[1] + point[1] * vector[0]
},

getRotation2DY_Check: function(point, vector) {
	return Vector.getRotation2DY(arrayKit.getArrayByElements(point, 2), arrayKit.getArrayByElements(vector, 2))
},

getSubtraction2D: function(elements, subtractor2D) {
	return Vector.subtract2D(elements.slice(0, 2), subtractor2D)
},

getSubtraction2D_Check: function(elements, subtractor2D) {
	return Vector.getSubtraction2D(arrayKit.getArrayByElements(elements, 2), arrayKit.getArrayByElements(subtractor2D, 2))
},

getSubtraction3D: function(elements, subtractor3D) {
	return Vector.subtract3D(elements.slice(0, 3), subtractor3D)
},

getSubtraction3D_Check: function(elements, subtractor3D) {
	return Vector.getSubtraction3D(arrayKit.getArrayByElements(elements, 3), arrayKit.getArrayByElements(subtractor3D, 3))
},

getSubtractionArray: function(elements, subtractors) {
	return Vector.subtractArray(elements.slice(0), subtractors)
},

getSubtractionArray_Check: function(elements, subtractors) {
	return Vector.getSubtractionArray(arrayKit.getArrayByElements(elements), arrayKit.getArrayByElements(subtractors))
},

intervalFromToBetween: function(from, toTen, along) {
	return Vector.intervalsFromToBetween(from, toTen, along)[0]
},

intervalsFromQuantityIncrement: function(from = 0.0, quantity = 11, increments = 1.0, includeFrom, includeTo) {
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
	var intervals = [from]
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

	return removeUnincluded(intervals, includeFrom, includeTo)
},

intervalsFromToAlong: function(from = 0.0, toTen = 10.0, alongs = 0.5, includeFrom, includeTo) {
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
},

intervalsFromToBetween: function(from, toTen, alongs) {
	return Vector.intervalsFromToAlong(from, toTen, alongs, false, false)
},

intervalsFromToIncrement: function(from = 0.0, toTen, increments = 1.0, includeFrom, includeTo) {
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
},

intervalsFromToQuantity: function(from = 0.0, toTen = 10.0, quantity = 11, includeFrom, includeTo) {
	var increment = toTen - from
	if (quantity < 0.0) {
		increment = -increment
		quantity = -quantity
	}

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

	increment /= quantity
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
},

length2D: function(elements) {
	return Math.sqrt(Vector.lengthSquared2D(elements))
},

length2D_Check: function(elements) {
	return Vector.length2D(arrayKit.getArrayByElements(elements, 2))
},

lengthSquared2D: function(elements) {
	return elements[0] * elements[0] + elements[1] * elements[1]
},

lengthSquared2D_Check: function(elements) {
	return Vector.lengthSquared2D(arrayKit.getArrayByElements(elements, 2))
},

length3D: function(elements) {
	return Math.sqrt(Vector.lengthSquared3D(elements))
},

length3D_Check: function(elements) {
	return Vector.length3D(arrayKit.getArrayByElements(elements, 3))
},

lengthSquared3D: function(elements) {
	return elements[0] * elements[0] + elements[1] * elements[1] + elements[2] * elements[2]
},

lengthSquared3D_Check: function(elements) {
	return Vector.lengthSquared3D(arrayKit.getArrayByElements(elements, 3))
},

lengthArray: function(elements) {
	return Math.sqrt(Vector.lengthSquaredArray(elements))
},

lengthArray_Check: function(elements) {
	return Vector.lengthArray(arrayKit.getArrayByElements(elements))
},

lengthSquaredArray: function(elements) {
	var lengthSquared = 0.0
	for (var element of elements) {
		lengthSquared += element * element
	}

	return lengthSquared
},

modifyObject_Private: function() {
	Vector.setPointByName.optionMap = gMapRS
},

multiply2D: function(elements, multiplier2D) {
	elements[0] *= multiplier2D[0]
	elements[1] *= multiplier2D[1]
	return elements
},

multiply2D_Check: function(elements, multiplier2D) {
	return Vector.multiply2D(arrayKit.getArrayByElements(elements, 2), arrayKit.getArrayByElements(multiplier2D, 2))
},

multiply2DScalar: function(elements, multiplierScalar) {
	elements[0] *= multiplierScalar
	elements[1] *= multiplierScalar
	return elements
},

multiply2DScalar_Check: function(elements, multiplierScalar) {
	return Vector.multiply2DScalar(arrayKit.getArrayByElements(elements, 2), Value.getValueDefault(multiplierScalar, 0.0))
},

multiply3D: function(elements, multiplier3D) {
	elements[0] *= multiplier3D[0]
	elements[1] *= multiplier3D[1]
	elements[2] *= multiplier3D[2]
	return elements
},

multiply3D_Check: function(elements, multiplier3D) {
	return Vector.multiply3D(arrayKit.getArrayByElements(elements, 3), arrayKit.getArrayByElements(multiplier3D, 3))
},

multiply3DScalar: function(elements, multiplierScalar) {
	elements[0] *= multiplierScalar
	elements[1] *= multiplierScalar
	elements[2] *= multiplierScalar
	return elements
},

multiply3DScalar_Check: function(elements, multiplierScalar) {
	return Vector.multiply3DScalar(arrayKit.getArrayByElements(elements, 3), Value.getValueDefault(multiplierScalar, 0.0))
},

multiplyArray: function(elements, multipliers, until) {
	var minimumLength = Vector.getMinimumLength(elements, multipliers, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] *= multipliers[elementIndex]
	}

	return elements
},

multiplyArray_Check: function(elements, multipliers, until) {
	return Vector.multiplyArray(arrayKit.getArrayByElements(elements), arrayKit.getArrayByElements(multipliers), until)
},

multiplyArrayScalar: function(elements, multiplierScalar) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		elements[elementIndex] *= multiplierScalar
	}

	return elements
},

multiplyArrayScalar_Check: function(elements, multiplierScalar) {
	return Vector.multiplyArrayScalar(arrayKit.getArrayByElements(elements), Value.getValueDefault(multiplierScalar, 0.0))
},

oppositeHypoteneuseAdjacent: function(hypoteneuse, otherSide) {
	return Math.sqrt(Vector.oppositeHypoteneuseAdjacentSquared(hypoteneuse, otherSide))
},

oppositeHypoteneuseAdjacent_Check: function(hypoteneuse, otherSide) {
	var oppositeHypoteneuseAdjacentSquared = this.Vector.oppositeHypoteneuseAdjacentSquared(hypoteneuse, otherSide)
	if (oppositeHypoteneuseAdjacentSquared < 0.0) {
		return 0.0
	}

	return Math.sqrt(oppositeHypoteneuseAdjacentSquared)
},

oppositeHypoteneuseAdjacentSquared: function(hypoteneuse, otherSide) {
	return hypoteneuse * hypoteneuse - otherSide * otherSide
},

oppositeHypoteneuseAdjacentSquared_Check: function(hypoteneuse, otherSide) {
	return Vector.oppositeHypoteneuseAdjacentSquared(getValueOne(hypoteneuse), Value.getValueDefault(otherSide, 1.0))
},

polarCounterclockwise: function(angle) {
	return [Math.cos(angle), Math.sin(angle)]
},

polar_Check: function(angle, radius, x, y) {
	var polar = Vector.polarRadius(Value.getValueDefault(angle, 0.0) * gRadiansPerDegree, Value.getValueDefault(radius, 1.0))
	polar[0] += Value.getValueDefault(x, 0.0)
	polar[1] += Value.getValueDefault(y, 0.0)
	return polar
},

polarRadius: function(angle, radius) {
	return [radius * Math.cos(angle), radius * Math.sin(angle)]
},

reverseSigns: function(elements) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		elements[elementIndex] = -elements[elementIndex]
	}

	return elements
},

reverseSigns_Check: function(elements) {
	return Vector.reverseSigns(arrayKit.getArrayByElements(elements))
},

rotate2DAngle: function(point, angle) {
	return Vector.rotate2DVector(arrayKit.getArrayByElements(point, 2), Vector.polarCounterclockwise(angle))
},

rotate2DAngle_Check: function(point, angle) {
	return Vector.rotate2DVector(arrayKit.getArrayByElements(point, 2), this.polar(Value.getValueDefault(angle, 0.0)))
},

rotate2DVector: function(point, vector) {
	var x = point[0] * vector[0] - point[1] * vector[1]
	point[1] = point[0] * vector[1] + point[1] * vector[0]
	point[0] = x
	return point
},

rotate2DVector_Check: function(point, vector) {
	return Vector.rotate2DVector(arrayKit.getArrayByElements(point, 2), arrayKit.getArrayByElements(vector, 2))
},

setPointByName: function(registry, statement, name, x, y, z) {
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
},

stepArray: function(elements, step, until) {
	var minimumLength = Math.min(elements.length, Value.getValueDefault(until, elements.length))
	for (var parameterIndex = 0; parameterIndex < minimumLength; parameterIndex++) {
		elements[parameterIndex] = Value.getStep(elements[parameterIndex], step)
	}

	return elements
},

stepArray_Check: function(elements, step = 1.0, until) {
	return Vector.stepArray(arrayKit.getArrayByElements(elements), step, until)
},

subtract2D: function(elements, subtractor2D) {
	elements[0] -= subtractor2D[0]
	elements[1] -= subtractor2D[1]
	return elements
},

subtract2D_Check: function(elements, subtractor2D) {
	return Vector.subtract2D(arrayKit.getArrayByElements(elements, 2), arrayKit.getArrayByElements(subtractor2D, 2))
},

subtract3D: function(elements, subtractor3D) {
	elements[0] -= subtractor3D[0]
	elements[1] -= subtractor3D[1]
	elements[2] -= subtractor3D[2]
	return elements
},

subtract3D_Check: function(elements, subtractor3D) {
	return Vector.subtract3D(arrayKit.getArrayByElements(elements, 3), arrayKit.getArrayByElements(subtractor3D, 3))
},

subtractArray: function(elements, subtractors, until) {
	var minimumLength = Vector.getMinimumLength(elements, subtractors, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] -= subtractors[elementIndex]
	}

	return elements
},

subtractArray_Check: function(elements, subtractors, until) {
	return Vector.subtractArray(arrayKit.getArrayByElements(elements), arrayKit.getArrayByElements(subtractors), until)
}
}
