// movies.js
const movieList = [
    {
    "id": 1478821,
    "title": "Mang Mẹ Đi Bỏ",
    "original_title": "Mang Mẹ Đi Bỏ",
    "overview": "Rời Xa Mẹ kể về câu chuyện của Hoan (Tuấn Trần), một chàng trai trẻ kiếm sống bằng nghề cắt tóc 'gã hề đường phố' để chăm sóc mẹ. Mẹ anh, Lê Thị Hạnh (Hồng Đào), mắc bệnh Alzheimer và cư xử như một đứa trẻ. Căn bệnh của bà không chỉ là gánh nặng tài chính mà còn tước đi cuộc sống tự do và những ước mơ mà anh vẫn đang theo đuổi. Một ngày nọ, Hoan đưa ra một quyết định định mệnh - 'gửi mẹ' cho anh trai mình ở Hàn Quốc, một người mà anh thậm chí chưa từng gặp mặt.",
    "poster_path": "https://image.tmdb.org/t/p/w500/ene2eO4C7We80YIcu7yX9zVGsSS.jpg",
    "release_date": "2025-07-30",
    "vote_average": 8,
    "dropbox_link": "https://www.dropbox.com/scl/fi/z4y1rojm0zztpvswfw8wd/Leaving-Mom.2025.1080p.WEB-DL.H264.AAC.mp4?rlkey=6gi8u981a64eq8eypyg5fvs2b&st=j7due4jf&dl=1&dl=1"
    },
    {
        "id": 1010756,
        "title": "Sát Nhân Giấu Mặt: Chương 2",
        "original_title": "The Strangers: Chapter 2",
        "overview": "Sau những sự kiện kinh hoàng ở phần trước, Maya bị mắc kẹt tại một thị trấn nhỏ không lối thoát. Khi màn đêm buông xuống, ba kẻ sát nhân đeo mặt nạ lại xuất hiện, biến nơi đây thành địa ngục trần gian. Maya không chỉ phải chạy trốn mà còn phải đối mặt với quá khứ và nỗi sợ hãi sâu thẳm nhất của mình.",
        "poster_path": "https://image.tmdb.org/t/p/w500/aEk9jLbiKTVssdATbrF879NvyyJ.jpg",
        "release_date": "2025-09-25",
        "vote_average": 6.11,
        // Đã sửa link dưới (xóa &dl=0 thừa)
        "dropbox_link": "https://www.dropbox.com/scl/fi/mjw76u8iknlaviooh7t61/The.Strangers.Chapter.2.2025.Hybrid.1080p.BluRay.x264-BRUTE.mkv?rlkey=o7lbomu84wex3zmmtkpoulisi&st=jqhmtvsd&dl=1"
    },
    {
    "id": 1390401,
    "title": "Vyšehrad Dvje",
    "original_title": "Vyšehrad Dvje",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/hb4prLWVThOJ4BgFacO5NqgYOcy.jpg",
    "release_date": "2025-04-17",
    "vote_average": 5.6,
    "dropbox_link": "https://www.dropbox.com/scl/fi/gnlxb6w1ycm4j5dkha2xi/Vysehrad-Dvje.2025.1080p.Blu-ray.Remux.AVC.DTS-HD.MA.5.1-MBH.mkv?rlkey=499nwmgbtlbh74pmesaoj59yo&st=4edqjhe8&dl=0&dl=1"
    },

    {
    "id": 1574042,
    "title": "Predator: Wastelands",
    "original_title": "Predator: Wastelands",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/bQ0neJZ5QAD6jRHIbbdx2rtMBUb.jpg",
    "release_date": "2025-11-04",
    "vote_average": 5.8,
    "dropbox_link": "https://www.dropbox.com/scl/fi/6rh7n133ab0wys7huk1jj/Predator.Wastelands.2025.1080p.AMZN.WEB-DL.DDP5.1.H.264-WADU.mkv?rlkey=wc2tpyghchuyztgxldylzdzk5&st=heorsg25&dl=0&dl=1"
    },

    {
    "id": 1241470,
    "title": "Cuộc Chiến Ngoài Hành Tinh",
    "original_title": "Osiris",
    "overview": "Một nhóm lính đặc nhiệm bị bắt cóc bởi một tàu vũ trụ bí ẩn trong lúc làm nhiệm vụ. Khi tỉnh lại, họ phải chiến đấu để sinh tồn trước một chủng tộc ngoài hành tinh hung hãn.",
    "poster_path": "https://image.tmdb.org/t/p/w500/3YtZHtXPNG5AleisgEatEfZOT2w.jpg",
    "release_date": "2025-07-25",
    "vote_average": 6.303,
    "dropbox_link": "https://www.dropbox.com/scl/fi/2c93rfp0pj10ewdz6xsc4/Osiris.2025.ViE.1080p.BluRay.x264-VETO.mkv?rlkey=0nra9arbtbu5z3apxi1amo32x&st=wwkd0j5q&dl=0&dl=1"
    },
    {
    "id": 1131759,
    "title": "Toàn Trí Độc Giả",
    "original_title": "전지적 독자 시점",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/6BTk9XiV6kVOzO5RSFRE2jEy0Yz.jpg",
    "release_date": "2025-07-23",
    "vote_average": 6.8,
    "dropbox_link": "https://www.dropbox.com/scl/fi/sdtysoqu94k66xwb61i7u/Omniscient.Reader.The.Prophecy.2025-1080p.BluRay.TrueHD.Atmos.7.1-x264-WATCHABLE.mkv?rlkey=z3wwcdcq49mju7ko2wrn4mrd0&st=ipm29c15&dl=0&dl=1"
    },

];
