import heapq
import pickle
import os
from collections import Counter
from typing import Dict, Any

class HuffmanNode:
    """Node class for Huffman tree construction"""
    def __init__(self, char: str = None, freq: int = 0, left=None, right=None):
        self.char = char
        self.freq = freq
        self.left = left
        self.right = right
    
    def __lt__(self, other):
        return self.freq < other.freq

class HuffmanCompressor:
    """
    Huffman Coding Compression Algorithm
    
    Huffman coding is a lossless data compression algorithm that assigns variable-length 
    codes to characters based on their frequency of occurrence. Characters that appear 
    more frequently get shorter codes, while less frequent characters get longer codes.
    
    How it works:
    1. Count frequency of each character/byte in the input
    2. Build a binary tree where frequent characters are closer to root
    3. Assign binary codes: left = 0, right = 1
    4. Replace original data with these variable-length codes
    
    Benefits:
    - Optimal prefix-free coding (no code is prefix of another)
    - Significant compression for text with non-uniform character distribution
    - Lossless compression (perfect reconstruction)
    
    Best for: Text files, source code, structured data
    Not ideal for: Already compressed files (images, videos), random data
    """
    
    def __init__(self):
        self.codes = {}
        self.reverse_codes = {}
        self.root = None
    
    def _build_frequency_table(self, data: bytes) -> Dict[int, int]:
        """Build frequency table for bytes in data"""
        return Counter(data)
    
    def _build_huffman_tree(self, freq_table: Dict[int, int]) -> HuffmanNode:
        """Build Huffman tree using priority queue (min-heap)"""
        if not freq_table:
            return None
        
        # Create leaf nodes and add to priority queue
        heap = []
        for byte_val, freq in freq_table.items():
            node = HuffmanNode(char=byte_val, freq=freq)
            heapq.heappush(heap, node)
        
        # Handle single character case
        if len(heap) == 1:
            root = HuffmanNode(freq=heap[0].freq)
            root.left = heapq.heappop(heap)
            return root
        
        # Build tree by combining nodes
        while len(heap) > 1:
            left = heapq.heappop(heap)
            right = heapq.heappop(heap)
            
            merged = HuffmanNode(freq=left.freq + right.freq)
            merged.left = left
            merged.right = right
            
            heapq.heappush(heap, merged)
        
        return heap[0]
    
    def _generate_codes(self, root: HuffmanNode, code: str = "", codes: Dict[int, str] = None) -> Dict[int, str]:
        """Generate Huffman codes by traversing the tree"""
        if codes is None:
            codes = {}
        
        if root:
            # Leaf node - store the code
            if root.char is not None:
                codes[root.char] = code if code else "0"  # Handle single char case
            else:
                # Traverse tree: left = 0, right = 1
                self._generate_codes(root.left, code + "0", codes)
                self._generate_codes(root.right, code + "1", codes)
        
        return codes
    
    def compress(self, input_file: str, output_file: str) -> Dict[str, Any]:
        """
        Compress a file using Huffman coding
        
        Args:
            input_file: Path to input file
            output_file: Path to compressed output file
            
        Returns:
            Dictionary with compression statistics
        """
        # Read input file
        with open(input_file, 'rb') as f:
            data = f.read()
        
        if not data:
            raise ValueError("Input file is empty")
        
        original_size = len(data)
        
        # Build frequency table
        freq_table = self._build_frequency_table(data)
        
        # Build Huffman tree
        self.root = self._build_huffman_tree(freq_table)
        
        # Generate codes
        self.codes = self._generate_codes(self.root)
        self.reverse_codes = {v: k for k, v in self.codes.items()}
        
        # Encode data
        encoded_bits = []
        for byte in data:
            encoded_bits.append(self.codes[byte])
        
        encoded_string = ''.join(encoded_bits)
        
        # Convert bit string to bytes
        # Pad to make length multiple of 8
        padding = 8 - len(encoded_string) % 8
        if padding != 8:
            encoded_string += '0' * padding
        
        # Convert to bytes
        compressed_data = bytearray()
        for i in range(0, len(encoded_string), 8):
            byte = encoded_string[i:i+8]
            compressed_data.append(int(byte, 2))
        
        # Save compressed file with metadata
        compression_data = {
            'compressed_data': bytes(compressed_data),
            'tree': self.root,
            'original_size': original_size,
            'padding': padding
        }
        
        with open(output_file, 'wb') as f:
            pickle.dump(compression_data, f)
        
        compressed_size = os.path.getsize(output_file)
        compression_ratio = original_size / compressed_size if compressed_size > 0 else 0

        return {
            'original_size': original_size,
            'compressed_size': compressed_size,
            'compression_ratio': compression_ratio,
            'space_saved': ((original_size - compressed_size) / original_size) * 100,
            'codes_generated': len(self.codes)
        }
    
    def decompress(self, compressed_file: str, output_file: str) -> Dict[str, Any]:
        """
        Decompress a Huffman encoded file with comprehensive statistics
        
        Args:
            compressed_file: Path to compressed file
            output_file: Path to decompressed output file
            
        Returns:
            Dictionary with detailed decompression statistics and metadata
        """
        import time
        import os
        
        start_time = time.time()
        
        try:
            # Load compressed data
            with open(compressed_file, 'rb') as f:
                compression_data = pickle.load(f)
            
            compressed_data = compression_data['compressed_data']
            tree_root = compression_data['tree']
            original_size = compression_data['original_size']
            padding = compression_data['padding']
            
            # Get additional metadata if available
            huffman_codes = compression_data.get('huffman_codes', {})
            frequency_table = compression_data.get('frequency_table', {})
            compression_timestamp = compression_data.get('timestamp', None)
            
            # File size information
            compressed_file_size = os.path.getsize(compressed_file)
            
            # Convert bytes back to bit string
            bit_string = ''.join(format(byte, '08b') for byte in compressed_data)
            total_bits_before_padding = len(bit_string)
            
            # Remove padding
            if padding != 8:
                bit_string = bit_string[:-padding]
            
            effective_bits = len(bit_string)
            
            # Decode using tree
            decoded_data = bytearray()
            current_node = tree_root
            chars_decoded = 0
            
            for bit in bit_string:
                if current_node.char is not None:  # Leaf node
                    decoded_data.append(current_node.char)
                    chars_decoded += 1
                    current_node = tree_root
                
                if bit == '0':
                    current_node = current_node.left
                else:
                    current_node = current_node.right
            
            # Handle last character
            if current_node and current_node.char is not None:
                decoded_data.append(current_node.char)
                chars_decoded += 1
            
            # Write decompressed file
            with open(output_file, 'wb') as f:
                f.write(bytes(decoded_data))
            
            end_time = time.time()
            decompression_time = end_time - start_time
            
            # Validate decompression
            decompressed_size = len(decoded_data)
            size_match = decompressed_size == original_size
            
            return {
                # File information
                'compressed_file': compressed_file,
                'output_file': output_file,
                'compressed_file_size': compressed_file_size,
                
                # Size information
                'original_size': original_size,
                'decompressed_size': decompressed_size,
                'size_match': size_match,
                
                # Bit-level information
                'total_bits_in_file': total_bits_before_padding,
                'effective_bits_used': effective_bits,
                'padding_bits': padding if padding != 8 else 0,
                
                # Decoding information
                'characters_decoded': chars_decoded,
                
                # Performance metrics
                'decompression_time_seconds': round(decompression_time, 4),
                
                # Tree information
                'tree_depth': self._calculate_tree_depth(tree_root) if hasattr(self, '_calculate_tree_depth') else None,
                'unique_characters': len(huffman_codes) if huffman_codes else None,
                
                # Metadata
                'compression_timestamp': compression_timestamp,
                'decompression_timestamp': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(end_time)),
                
                # Validation
                'success': size_match and decompressed_size > 0,
                'error_message': None if size_match else f"Size mismatch: expected {original_size}, got {decompressed_size}"
            }
            
        except Exception as e:
            return {
                'compressed_file': compressed_file,
                'output_file': output_file,
                'success': False,
                'error_message': str(e),
                'decompression_time_seconds': time.time() - start_time,
                'original_size': None,
                'decompressed_size': 0
            }
    
    def get_compression_info(self) -> Dict[str, Any]:
        """Get information about the compression codes"""
        if not self.codes:
            return {}
        
        code_lengths = [len(code) for code in self.codes.values()]
        avg_code_length = sum(code_lengths) / len(code_lengths)
        
        return {
            'total_symbols': len(self.codes),
            'average_code_length': avg_code_length,
            'min_code_length': min(code_lengths),
            'max_code_length': max(code_lengths),
            'codes': {chr(k) if 32 <= k <= 126 else f'\\x{k:02x}': v 
                     for k, v in list(self.codes.items())[:10]}  # Show first 10
        }

def compress_file(input_path: str, output_path: str = None) -> Dict[str, Any]:
    """
    Convenience function to compress any file
    
    Args:
        input_path: Path to file to compress
        output_path: Output path (optional)
    
    Returns:
        Compression statistics
    """
    if output_path is None:
        output_path = input_path + '.huff'
    
    compressor = HuffmanCompressor()
    stats = compressor.compress(input_path, output_path)
    compression_info = compressor.get_compression_info()
    
    return {**stats, 'compression_info': compression_info}

def decompress_file(compressed_path: str, output_path: str = None) -> Dict[str, Any]:
    """
    Convenience function to decompress a Huffman compressed file
    
    Args:
        compressed_path: Path to compressed file
        output_path: Output path (optional)
    
    Returns:
        Decompression statistics
    """
    if output_path is None:
        output_path = compressed_path.replace('.huff', '_decompressed')
    
    compressor = HuffmanCompressor()
    return compressor.decompress(compressed_path, output_path)