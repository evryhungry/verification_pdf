package org.capsc.pdf.template.service;

import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.capsc.pdf.template.dto.TemplateListResponse;
import org.capsc.pdf.template.dto.TemplateUploadRequest;
import org.capsc.pdf.template.entity.Template;
import org.capsc.pdf.template.repository.TemplateRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TemplateServiceImpl implements TemplateService {

    private final TemplateRepository templateRepository;

    @Value("${file.upload.pdf-path}")
    private String uploadPdfPath;

    @Value("${file.upload.image-path}")
    private String uploadImagePath;

    @Override
    public Template uploadTemplate(MultipartFile pdf, TemplateUploadRequest dto) {
        String uniqueId = UUID.randomUUID().toString();

        String savedPdfPath = uploadPdfPath + uniqueId + ".pdf";
        String savedImagePath = uploadImagePath + uniqueId + ".jpg";
        String imageFileName = uniqueId + ".jpg";
        String imageUrl = "/static/image/" + imageFileName;

        new File(uploadPdfPath).mkdirs();
        new File(uploadImagePath).mkdirs();

        try {
            File dest = new File(savedPdfPath);
            pdf.transferTo(dest);
            createImageFromPdfFirstPage(dest.getAbsolutePath(), savedImagePath);

        } catch (IOException e) {
            throw new RuntimeException("파일 저장 실패", e);
        }

        Template template = Template.builder()
                .userid(dto.getUserId())
                .name(dto.getName())
                .description(dto.getDescription())
                .isPublic(dto.isPublic())
                .pdfFilePath(savedPdfPath)
                .pdfImagePath(savedImagePath)
                .pdfImageUrl(imageUrl)
                .build();

        return templateRepository.save(template);
    }

    @Override
    public List<TemplateListResponse> getAllTemplates(UUID userId) {
        return templateRepository.findAllByUserid(userId).stream()
                .map(TemplateListResponse::templateListResponse)
                .collect(Collectors.toList());
    }

    private void createImageFromPdfFirstPage(String pdfPath, String imagePath) {
        try (PDDocument document = PDDocument.load(new File(pdfPath))) {
            PDFRenderer pdfRenderer = new PDFRenderer(document);
            BufferedImage image = pdfRenderer.renderImageWithDPI(0, 300);
            ImageIO.write(image, "jpg", new File(imagePath));
        } catch (IOException e) {
            throw new RuntimeException("PDF 이미지 변환 실패", e);
        }
    }
}